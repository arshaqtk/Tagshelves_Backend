import Product, { IProduct } from "./product.model";

export class ProductService {
  public static async getProductsByOrg(organizationId: string): Promise<IProduct[]> {
    return await Product.find({ organizationId }).sort({ createdAt: -1 });
  }

  public static async createProducts(
    items: any[],
    organizationId: string
  ): Promise<IProduct[]> {
    const docs = items.map((item) => ({
      ...item,
      organizationId,
    }));
    return await Product.insertMany(docs, { ordered: false });
  }
}
