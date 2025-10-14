export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface TransactionCategories {
  income: Category[];
  expenses: Category[];
}

export const transactionCategories: TransactionCategories = {
  income: [
    { id: "salario", name: "Salário", icon: "💰" },
    { id: "freelance", name: "Freelance", icon: "💼" },
    { id: "investimentos", name: "Investimentos", icon: "📈" },
    { id: "outras_receitas", name: "Outras Receitas", icon: "💵" },
  ],
  expenses: [
    { id: "alimentacao", name: "Alimentação", icon: "🍔" },
    { id: "transporte", name: "Transporte", icon: "🚗" },
    { id: "moradia", name: "Moradia", icon: "🏠" },
    { id: "saude", name: "Saúde", icon: "🏥" },
    { id: "lazer", name: "Lazer", icon: "🎮" },
    { id: "compras", name: "Compras", icon: "🛍️" },
    { id: "educacao", name: "Educação", icon: "📚" },
    { id: "servicos", name: "Serviços", icon: "💡" },
    { id: "outros", name: "Outros", icon: "📝" },
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
