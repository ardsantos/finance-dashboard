import React, { useState } from "react";
import Papa from "papaparse";
import { saveTransactions, loadTransactions } from "../utils/storage";
import { transactionCategories, getCategoryById } from "../data/categories";
import { categorizeTransaction } from "../utils/categorizer";
import { Transaction } from "../utils/storage";

export const ImportData: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    total: number;
    imported: number;
    errors: string[];
    skipped: number;
  } | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: Transaction[] = [];
          const errors: string[] = [];
          let skipped = 0;

          results.data.forEach((row: any, index: number) => {
            try {
              const transaction = parseTransaction(row, index + 2);
              if (transaction) {
                transactions.push(transaction);
              } else {
                skipped++;
              }
            } catch (error) {
              errors.push(
                `Linha ${index + 2}: ${
                  error instanceof Error ? error.message : "Erro desconhecido"
                }`
              );
            }
          });

          // Set preview (first 5 rows)
          setPreviewData(transactions.slice(0, 5));

          setImportResults({
            total: results.data.length,
            imported: transactions.length,
            errors,
            skipped,
          });

          // Save transactions
          if (transactions.length > 0) {
            const existingTransactions = loadTransactions();
            const allTransactions = [...transactions, ...existingTransactions];
            saveTransactions(allTransactions);
          }
        } catch (error) {
          setImportResults({
            total: 0,
            imported: 0,
            errors: [
              `Erro geral: ${
                error instanceof Error ? error.message : "Erro desconhecido"
              }`,
            ],
            skipped: 0,
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        setImportResults({
          total: 0,
          imported: 0,
          errors: [`Erro ao ler arquivo: ${error.message}`],
          skipped: 0,
        });
        setIsImporting(false);
      },
    });
  };

  const parseTransaction = (
    row: any,
    lineNumber: number
  ): Transaction | null => {
    // Try different column name variations
    const date = row.date || row.Data || row.data || row.DATA;
    const description =
      row.description ||
      row.Description ||
      row.descrição ||
      row.DESCRIPTION ||
      row["Descrição"];
    const amount =
      row.amount || row.Amount || row.valor || row.Valor || row.VALOR;
    const category =
      row.category ||
      row.Category ||
      row.categoria ||
      row.Categoria ||
      row.CATEGORIA;
    const account =
      row.account ||
      row.Account ||
      row.conta ||
      row.Conta ||
      row.CONTA ||
      "Importado";

    if (!date || !description || !amount) {
      console.warn(`Linha ${lineNumber}: Campos obrigatórios faltando`, row);
      return null;
    }

    // Parse amount (handle Brazilian format)
    let parsedAmount = 0;
    const amountStr = amount.toString().trim();

    // Remove currency symbols and clean
    const cleanAmount = amountStr
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace("-", "-");

    parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount)) {
      throw new Error(`Valor inválido: ${amount}`);
    }

    // Parse date (handle Brazilian format)
    let parsedDate = date.toString().trim();

    // Try different date formats
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    ];

    if (dateFormats[1].test(parsedDate)) {
      // DD/MM/YYYY -> YYYY-MM-DD
      const [day, month, year] = parsedDate.split("/");
      parsedDate = `${year}-${month}-${day}`;
    } else if (dateFormats[2].test(parsedDate)) {
      // DD-MM-YYYY -> YYYY-MM-DD
      const [day, month, year] = parsedDate.split("-");
      parsedDate = `${year}-${month}-${day}`;
    }

    // Get category
    let transactionCategory = "outros";
    if (category) {
      // Map known categories
      const categoryMap: Record<string, string> = {
        alimentação: "alimentacao",
        alimentacao: "alimentacao",
        transporte: "transporte",
        moradia: "moradia",
        saúde: "saude",
        saude: "saude",
        lazer: "lazer",
        compras: "compras",
        educação: "educacao",
        educacao: "educacao",
        serviços: "servicos",
        servicos: "servicos",
        salário: "salario",
        salario: "salario",
        freelance: "freelance",
        investimentos: "investimentos",
        "outras receitas": "outras_receitas",
      };

      const normalizedCategory = category.toLowerCase().trim();
      transactionCategory =
        categoryMap[normalizedCategory] || normalizedCategory;
    } else {
      // Auto-categorize based on description
      const categorization = categorizeTransaction(description);
      transactionCategory = categorization.categoryId;
    }

    return {
      id: `import_${Date.now()}_${lineNumber}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      date: parsedDate,
      description: description.trim(),
      amount: parsedAmount,
      category: transactionCategory,
      account: account || "Importado",
      isManual: false,
    };
  };

  const handleLoadSampleData = () => {
    try {
      const sampleTransactions = generateSampleCSVData();
      const csvContent = sampleTransactions
        .map((row) => Object.values(row).join(","))
        .join("\n");
      const headers = Object.keys(sampleTransactions[0]).join(",");
      const fullCSV = headers + "\n" + csvContent;

      const blob = new Blob([fullCSV], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "exemplo_transacoes.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating sample CSV:", error);
      alert("Erro ao gerar arquivo de exemplo");
    }
  };

  const generateSampleCSVData = () => {
    return [
      {
        Data: "15/10/2024",
        Descrição: "Supermercado Carrefour - Compras mensais",
        Valor: "-450,75",
        Categoria: "Alimentação",
        Conta: "Nubank",
      },
      {
        Data: "14/10/2024",
        Descrição: "Uber Viagem para Shopping",
        Valor: "-35,50",
        Categoria: "Transporte",
        Conta: "Itaú",
      },
      {
        Data: "10/10/2024",
        Descrição: "Salário - Depósito empresa",
        Valor: "8500,00",
        Categoria: "Salário",
        Conta: "Bradesco",
      },
      {
        Data: "12/10/2024",
        Descrição: "Netflix Brasil Mensalidade",
        Valor: "-55,90",
        Categoria: "Lazer",
        Conta: "Nubank",
      },
      {
        Data: "08/10/2024",
        Descrição: "Farmácia Droga Raia - Medicamentos",
        Valor: "-127,30",
        Categoria: "Saúde",
        Conta: "Inter",
      },
    ];
  };

  return (
    <div className="import-data max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Importar Dados</h1>
        <p className="text-gray-600 mt-2">
          Importe suas transações de arquivos CSV com categorização automática
          brasileira
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Importar Arquivo CSV
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione um arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p className="mb-2">O arquivo CSV deve conter as colunas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Data</strong> (DD/MM/YYYY ou YYYY-MM-DD)
              </li>
              <li>
                <strong>Descrição</strong> (texto da transação)
              </li>
              <li>
                <strong>Valor</strong> (formato brasileiro: -123,45)
              </li>
              <li>
                <strong>Categoria</strong> (opcional)
              </li>
              <li>
                <strong>Conta</strong> (opcional)
              </li>
            </ul>
          </div>

          <button
            onClick={handleLoadSampleData}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            📥 Baixar Exemplo CSV
          </button>
        </div>

        {/* Brazilian Categories Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Categorias Brasileiras
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Receitas</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {transactionCategories.income.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-red-700 mb-2">Despesas</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {transactionCategories.expenses.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Resultado da Importação
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {importResults.total}
              </div>
              <div className="text-sm text-gray-600">Total de Linhas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {importResults.imported}
              </div>
              <div className="text-sm text-gray-600">Importadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {importResults.skipped}
              </div>
              <div className="text-sm text-gray-600">Ignoradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {importResults.errors.length}
              </div>
              <div className="text-sm text-gray-600">Erros</div>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-700 mb-2">
                Erros encontrados:
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <ul className="text-sm text-red-800 space-y-1">
                  {importResults.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResults.errors.length > 10 && (
                    <li className="text-red-600">
                      ... e mais {importResults.errors.length - 10} erros
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">
                Preview (primeiras 5 transações):
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Data
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Descrição
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Valor
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Categoria
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((transaction, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {transaction.date}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td
                          className={`px-4 py-2 text-sm font-medium ${
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          R$ {Math.abs(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {getCategoryById(transaction.category)?.name ||
                            transaction.category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isImporting && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Importando dados...
          </div>
        </div>
      )}
    </div>
  );
};
