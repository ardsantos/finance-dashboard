export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionCategories {
  income: Category[];
  expenses: Category[];
}

export const transactionCategories: TransactionCategories = {
  income: [
    { id: "salario", name: "Salário", icon: "💰", color: "#10B981" },
    { id: "freelance", name: "Freelance", icon: "💼", color: "#06B6D4" },
    { id: "investimentos", name: "Investimentos", icon: "📈", color: "#8B5CF6" },
    { id: "outras_receitas", name: "Outras Receitas", icon: "💵", color: "#6B7280" },
  ],
  expenses: [
    { id: "alimentacao", name: "Alimentação", icon: "🍔", color: "#F59E0B" },
    { id: "transporte", name: "Transporte", icon: "🚗", color: "#EF4444" },
    { id: "moradia", name: "Moradia", icon: "🏠", color: "#3B82F6" },
    { id: "saude", name: "Saúde", icon: "🏥", color: "#EC4899" },
    { id: "lazer", name: "Lazer", icon: "🎮", color: "#8B5CF6" },
    { id: "compras", name: "Compras", icon: "🛍️", color: "#14B8A6" },
    { id: "educacao", name: "Educação", icon: "📚", color: "#F97316" },
    { id: "servicos", name: "Serviços", icon: "💡", color: "#FBBF24" },
    { id: "outros", name: "Outros", icon: "📝", color: "#6B7280" },
  ],
};

export const getCategoryById = (id: string): Category | undefined => {
  const allCategories = [
    ...transactionCategories.income,
    ...transactionCategories.expenses,
  ];
  return allCategories.find((category) => category.id === id);
};

export const getCategoriesByType = (
  type: keyof TransactionCategories
): Category[] => {
  return transactionCategories[type] || [];
};
