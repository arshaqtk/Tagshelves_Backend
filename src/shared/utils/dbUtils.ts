import mongoose from "mongoose";
import Product from "../../modules/products/product.model";

export async function getDbStats(organizationId: string) {
  const orgIdObj = new mongoose.Types.ObjectId(organizationId);

  const statsAggregation = await Product.aggregate([
    { $match: { organizationId: orgIdObj } },
    {
      $group: {
        _id: null,
        productCount: { $sum: 1 },
        activeOffers: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
        },
        expiredOffers: {
          $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] }
        },
        estimatedSavings: {
          $sum: {
            $max: [
              0,
              { $subtract: [{ $ifNull: ["$crossPrice", 0] }, "$promoPrice"] }
            ]
          }
        }
      }
    }
  ]);

  return statsAggregation[0] || {
    activeOffers: 0,
    expiredOffers: 0,
    productCount: 0,
    estimatedSavings: 0
  };
}

export async function getDashboardMetrics(organizationId: string) {
  const orgIdObj = new mongoose.Types.ObjectId(organizationId);

  const statsAggregation = await Product.aggregate([
    { $match: { organizationId: orgIdObj } },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              productCount: { $sum: 1 },
              activeOffers: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
              },
              expiredOffers: {
                $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] }
              },
              estimatedSavings: {
                $sum: {
                  $max: [
                    0,
                    { $subtract: [{ $ifNull: ["$crossPrice", 0] }, "$promoPrice"] }
                  ]
                }
              },
              totalLift: {
                $sum: {
                  $cond: {
                    if: { $and: [{ $gt: ["$crossPrice", 0] }, { $ne: ["$crossPrice", null] }] },
                    then: { $multiply: [{ $divide: [{ $subtract: ["$crossPrice", "$promoPrice"] }, "$crossPrice"] }, 100] },
                    else: 0
                  }
                }
              },
              liftCount: {
                $sum: {
                  $cond: {
                    if: { $and: [{ $gt: ["$crossPrice", 0] }, { $ne: ["$crossPrice", null] }] },
                    then: 1,
                    else: 0
                  }
                }
              }
            }
          }
        ],
        ranges: [
          {
            $project: {
              liftPercent: {
                $cond: {
                  if: { $and: [{ $gt: ["$crossPrice", 0] }, { $ne: ["$crossPrice", null] }] },
                  then: { $multiply: [{ $divide: [{ $subtract: ["$crossPrice", "$promoPrice"] }, "$crossPrice"] }, 100] },
                  else: 0
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              r1: { $sum: { $cond: [{ $and: [{ $gt: ["$liftPercent", 0] }, { $lte: ["$liftPercent", 15] }] }, 1, 0] } },
              r2: { $sum: { $cond: [{ $and: [{ $gt: ["$liftPercent", 15] }, { $lte: ["$liftPercent", 30] }] }, 1, 0] } },
              r3: { $sum: { $cond: [{ $and: [{ $gt: ["$liftPercent", 30] }, { $lte: ["$liftPercent", 50] }] }, 1, 0] } },
              r4: { $sum: { $cond: [{ $gt: ["$liftPercent", 50] }, 1, 0] } }
            }
          }
        ]
      }
    }
  ]);

  const rawStats = statsAggregation[0]?.stats[0] || {
    activeOffers: 0,
    expiredOffers: 0,
    productCount: 0,
    estimatedSavings: 0,
    totalLift: 0,
    liftCount: 0
  };

  const rawRanges = statsAggregation[0]?.ranges[0] || { r1: 0, r2: 0, r3: 0, r4: 0 };

  const averageLift = rawStats.liftCount > 0 ? Math.round(rawStats.totalLift / rawStats.liftCount) : 18;

  const hasProducts = rawStats.productCount > 0;

  return {
    activeOffers: rawStats.activeOffers,
    expiredOffers: rawStats.expiredOffers,
    productCount: rawStats.productCount,
    estimatedSavings: rawStats.estimatedSavings,
    averageLift,
    discountDistribution: [
      hasProducts ? rawRanges.r1 : 3,
      hasProducts ? rawRanges.r2 : 8,
      hasProducts ? rawRanges.r3 : 5,
      hasProducts ? rawRanges.r4 : 2
    ]
  };
}
