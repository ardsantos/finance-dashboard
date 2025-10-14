import React, { useState, useEffect } from "react";
import {
  categorizeTransaction,
  learnFromCorrection,
  CategorizationResult,
} from "../utils/categorizer";
import {
  loadTransactions,
  saveTransactions,
  Transaction,
} from "../utils/storage";
import { transactionCategories, getCategoryById } from "../data/categories";

interface TransactionFormProps {
  onTransactionAdded?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onTransactionAdded,
}) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [account, setAccount] = useState("Nubank");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categorization, setCategorization] =
    useState<CategorizationResult | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const brazilianAccounts = [
    "Nubank",
    "Itaú",
    "Bradesco",
    "Caixa",
    "Inter",
    "PicPay",
  ];

  useEffect(() => {
    if (description.length > 2 && !isManual) {
      const result = categorizeTransaction(description);
      setCategorization(result);
      setSelectedCategory(result.categoryId);
      setShowSuggestions(result.confidence < 0.8);
    }
  }, [description, isManual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || !date) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      description,
      amount: parseFloat(amount),
      category: selectedCategory,
      account,
      isManual,
    };

    const transactions = loadTransactions();
    transactions.unshift(transaction);
    saveTransactions(transactions);

    // Learn from user input if they manually selected a different category
    if (
      categorization &&
      categorization.categoryId !== selectedCategory &&
      !isManual
    ) {
      learnFromCorrection(description, selectedCategory);
    }

    // Reset form
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedCategory("");
    setCategorization(null);
    setIsManual(false);
    setShowSuggestions(false);

    onTransactionAdded?.();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsManual(true);
    setShowSuggestions(false);
  };

  const getSuggestedCategories = () => {
    if (!categorization) return [];

    const allCategories = [
      ...transactionCategories.income,
      ...transactionCategories.expenses,
    ];
    const currentCategory = allCategories.find(
      (cat) => cat.id === categorization.categoryId
    );
    const otherCategories = allCategories.filter(
      (cat) => cat.id !== categorization.categoryId
    );

    return [currentCategory, ...otherCategories.slice(0, 4)].filter(Boolean);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category ? category.icon : "📝";
  };

  return (
    <div className="transaction-form bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Nova Transação
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Supermercado Carrefour"
              required
            />
            {categorization && !isManual && (
              <div className="mt-1 text-xs text-gray-500">
                Categoria sugerida: {getCategoryIcon(categorization.categoryId)}{" "}
                {getCategoryById(categorization.categoryId)?.name}
                <span className="ml-2 text-gray-400">
                  ({Math.round(categorization.confidence * 100)}% confiança)
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Use - para despesas, + para receitas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conta
            </label>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {brazilianAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria
          </label>

          {showSuggestions && categorization && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 mb-2">
                Baixa confiança na categorização automática. Selecione a
                categoria correta:
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {getSuggestedCategories().map((category) => (
              <button
                key={category?.id}
                type="button"
                onClick={() => handleCategoryChange(category?.id || "")}
                className={`p-3 rounded-md border-2 transition-all ${
                  selectedCategory === category?.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-1">{category?.icon}</div>
                <div className="text-xs font-medium text-gray-700">
                  {category?.name}
                </div>
                {categorization &&
                  categorization.categoryId === category?.id &&
                  !isManual && (
                    <div className="text-xs text-blue-600 mt-1">
                      {Math.round(categorization.confidence * 100)}% auto
                    </div>
                  )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setIsManual(false);
              if (description) {
                const result = categorizeTransaction(description);
                setCategorization(result);
                setSelectedCategory(result.categoryId);
                setShowSuggestions(result.confidence < 0.8);
              }
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Usar Categoria Automática
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Adicionar Transação
          </button>
        </div>
      </form>
    </div>
  );
};
