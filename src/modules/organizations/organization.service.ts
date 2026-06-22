import Organization, { IOrganization } from "./organization.model";

export async function createOrganization(
  name: string,
  email: string,
  password: string,
  plan: "free" | "pro" | "enterprise" = "free"
): Promise<IOrganization> {
  return await Organization.create({ name, email, password, plan });
}

export async function getOrganizationById(id: string): Promise<IOrganization | null> {
  return await Organization.findById(id);
}
