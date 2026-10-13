export type ContactMessageStatus = "new" | "read" | "archived" | "spam";

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}
