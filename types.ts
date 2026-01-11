export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Expense {
  prepared: string;
  id: string;
  amount: number;
  date: string; // ISO string
  note: string;
  categoryId?: string;
  categoryName?: string; // Denormalized for display convenience
  categoryIcon?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentMethodIcon?: string;
  type: "expense" | "income";
  createdTime: string;
  lastEditedTime: string;
}
