import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { saveTransactions, loadTransactions } from "../utils/storage";
import { transactionCategories, getCategoryById } from "../data/categories";
import { categorizeTransaction } from "../utils/categorizer";
import { Transaction } from "../utils/storage";
import { parseAmount, parseDate, detectDelimiter } from "../utils/parsers";

// Enhanced interfaces for CSV import
interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  categoryColumn?: string;
  accountColumn?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface PreviewRow {
  originalRow: any;
  parsedData: Transaction | null;
  validation: ValidationResult;
  rowNumber: number;
}

interface ImportSummary {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  duplicates: number;
}

const COLUMN_PATTERNS = {
  date: [
    'data', 'data da transação', 'data da operação', 'date', 'transaction date',
    'data lançamento', 'data movimento', 'dt lançamento', 'data', 'date'
  ],
  description: [
    'descrição', 'descrição da transação', 'descrição da operação', 'description',
    'memo', 'notes', 'histórico', 'descrição histórico', 'observação',
    'descrição', 'description', 'memo', 'histórico'
  ],
  amount: [
    'valor', 'valor da transação', 'valor (r$)', 'amount', 'value', 'valor (brl)',
    'valor rs', 'valor r$', 'valor lançamento', 'valor', 'amount', 'value'
  ],
  category: [
    'categoria', 'category', 'type', 'tipo', 'classificação', 'classification'
  ],
  account: [
    'conta', 'account', 'banco', 'bank', 'cartão', 'card', 'origem', 'origin'
  ]
};

export const ImportData: React.FC = () => {
  // Enhanced state management
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    total: number;
    imported: number;
    errors: string[];
    skipped: number;
  } | null>(null);

  // New states for enhanced CSV import
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'confirmation'>('upload');
  const [importError, setImportError] = useState<string | null>(null);

  // Legacy state for backward compatibility
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Enhanced drag-and-drop file handling
  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setImportError(null);
    processFile(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileDrop(acceptedFiles);
  }, [handleFileDrop]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024, // 10MB limit
    multiple: false,
    onError: (error) => {
      setImportError(`Erro ao processar arquivo: ${error.message}`);
    }
  });

  // Legacy file input handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    processFile(file);
  };

  // Main file processing function
  const processFile = (file: File) => {
    setUploadedFile(file);
    setIsImporting(true);
    setCurrentStep('mapping');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setImportError('Não foi possível ler o conteúdo do arquivo');
        setIsImporting(false);
        return;
      }

      // Detect delimiter first
      const delimiter = detectDelimiter(content);

      // Parse with PapaParse using our detected delimiter
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              setImportError(`Erros ao processar CSV: ${results.errors.map(e => e.message).join(', ')}`);
              setIsImporting(false);
              return;
            }

            const data = results.data;
            setRawData(data);

            if (data.length === 0) {
              setImportError('O arquivo não contém dados válidos');
              setIsImporting(false);
              return;
            }

            // Extract available columns
            const columns = Object.keys(data[0] || {});
            setAvailableColumns(columns);

            // Auto-detect column mapping
            const autoMapping = detectColumnMapping(columns);
            setColumnMapping(autoMapping);

            // Process preview data
            processPreviewData(data, autoMapping);

            setIsImporting(false);
          } catch (error) {
            setImportError(`Erro ao processar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            setIsImporting(false);
          }
        },
        error: (error: any) => {
          setImportError(`Erro ao ler arquivo CSV: ${error.message}`);
          setIsImporting(false);
        }
      });
    };

    reader.onerror = () => {
      setImportError('Erro ao ler arquivo');
      setIsImporting(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Column mapping detection function
  const detectColumnMapping = (columns: string[]): ColumnMapping => {
    const normalizedColumns = columns.map(col => col.toLowerCase().trim());

    const findBestMatch = (patterns: string[]): string | undefined => {
      let bestMatch: string | undefined;
      let bestScore = 0;

      patterns.forEach(pattern => {
        normalizedColumns.forEach((col, index) => {
          const score = calculateSimilarity(pattern, col);
          if (score > bestScore && score > 0.6) { // 60% similarity threshold
            bestScore = score;
            bestMatch = columns[index];
          }
        });
      });

      return bestMatch;
    };

    const dateColumn = findBestMatch(COLUMN_PATTERNS.date) || columns[0];
    const descriptionColumn = findBestMatch(COLUMN_PATTERNS.description) || columns[1];
    const amountColumn = findBestMatch(COLUMN_PATTERNS.amount) || columns[2];
    const categoryColumn = findBestMatch(COLUMN_PATTERNS.category);
    const accountColumn = findBestMatch(COLUMN_PATTERNS.account);

    return {
      dateColumn,
      descriptionColumn,
      amountColumn,
      categoryColumn,
      accountColumn
    };
  };

  // Simple similarity calculation for column matching
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance for string similarity
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  // Process preview data with validation
  const processPreviewData = (data: any[], mapping: ColumnMapping) => {
    const preview: PreviewRow[] = [];
    const limitedData = data.slice(0, 10); // First 10 rows for preview

    limitedData.forEach((row, index) => {
      const validation = validateAndParseRow(row, mapping, index + 2);
      preview.push({
        originalRow: row,
        parsedData: validation.parsedData,
        validation: validation.validation,
        rowNumber: index + 2
      });
    });

    setPreviewRows(preview);
    setCurrentStep('preview');

    // Generate import summary
    generateImportSummary(data, mapping);
  };

  // Validate and parse individual row
  const validateAndParseRow = (row: any, mapping: ColumnMapping, rowNumber: number) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsedData: Transaction | null = null;

    try {
      // Parse date using Brazilian parser
      const dateValue = row[mapping.dateColumn];
      const parsedDate = parseDate(String(dateValue));
      if (!parsedDate) {
        errors.push(`Data inválida: ${dateValue}`);
      }

      // Parse amount using Brazilian parser
      const amountValue = row[mapping.amountColumn];
      const parsedAmount = parseAmount(String(amountValue));
      if (parsedAmount === null) {
        errors.push(`Valor inválido: ${amountValue}`);
      }

      // Parse description
      const descriptionValue = row[mapping.descriptionColumn];
      const description = String(descriptionValue).trim();
      if (!description) {
        errors.push('Descrição vazia');
      }

      // If no critical errors, create transaction
      if (parsedDate && parsedAmount !== null && description) {
        // Get category (from column or auto-detect)
        let category = 'outros';
        if (mapping.categoryColumn && row[mapping.categoryColumn]) {
          const providedCategory = String(row[mapping.categoryColumn]).trim().toLowerCase();
          category = providedCategory || 'outros';
        } else {
          // Auto-categorize
          const categorization = categorizeTransaction(description);
          category = categorization.categoryId;
        }

        // Get account (from column or default)
        let account = 'Importado';
        if (mapping.accountColumn && row[mapping.accountColumn]) {
          account = String(row[mapping.accountColumn]).trim() || 'Importado';
        }

        parsedData = {
          id: `import_${Date.now()}_${rowNumber}_${Math.random().toString(36).substr(2, 9)}`,
          date: parsedDate,
          description,
          amount: parsedAmount,
          category,
          account,
          isManual: false
        };
      }
    } catch (error) {
      errors.push(`Erro ao processar linha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return {
      parsedData,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    };
  };

  // Generate comprehensive import summary
  const generateImportSummary = (data: any[], mapping: ColumnMapping) => {
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    data.forEach((row, index) => {
      const result = validateAndParseRow(row, mapping, index + 2);
      if (result.validation.isValid) {
        validCount++;
      } else {
        errorCount++;
      }
      warningCount += result.validation.warnings.length;
    });

    const existingTransactions = loadTransactions();
    const duplicates = data.filter(row => {
      const result = validateAndParseRow(row, mapping, 0);
      if (!result.parsedData) return false;

      return existingTransactions.some(existing =>
        existing.date === result.parsedData!.date &&
        existing.description === result.parsedData!.description &&
        existing.amount === result.parsedData!.amount
      );
    }).length;

    setImportSummary({
      total: data.length,
      valid: validCount,
      errors: errorCount,
      warnings: warningCount,
      duplicates
    });
  };

  // Handler functions for the new workflow
  const handleColumnMappingUpdate = (updates: Partial<ColumnMapping>) => {
    if (!columnMapping) return;

    const newMapping = { ...columnMapping, ...updates };
    setColumnMapping(newMapping);

    // Re-process preview data with new mapping
    if (rawData.length > 0) {
      processPreviewData(rawData, newMapping);
    }
  };

  const handleConfirmImport = () => {
    if (!columnMapping || rawData.length === 0) {
      setImportError('Nenhum dado para importar');
      return;
    }

    setIsImporting(true);
    setCurrentStep('confirmation');

    try {
      const validTransactions: Transaction[] = [];
      const errors: string[] = [];

      // Process all data
      rawData.forEach((row, index) => {
        const result = validateAndParseRow(row, columnMapping, index + 2);
        if (result.validation.isValid && result.parsedData) {
          validTransactions.push(result.parsedData);
        } else {
          errors.push(`Linha ${index + 2}: ${result.validation.errors.join(', ')}`);
        }
      });

      // Save transactions
      if (validTransactions.length > 0) {
        const existingTransactions = loadTransactions();
        const allTransactions = [...validTransactions, ...existingTransactions];
        saveTransactions(allTransactions);
      }

      // Set results for display
      setImportResults({
        total: rawData.length,
        imported: validTransactions.length,
        errors,
        skipped: rawData.length - validTransactions.length
      });

      // Also set legacy previewData for compatibility
      setPreviewData(validTransactions.slice(0, 5));

    } catch (error) {
      setImportError(`Erro ao importar transações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setRawData([]);
    setColumnMapping(null);
    setAvailableColumns([]);
    setPreviewRows([]);
    setImportSummary(null);
    setCurrentStep('upload');
    setImportError(null);
    setImportResults(null);
  };

  const handleBackToMapping = () => {
    setCurrentStep('mapping');
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
    <div className="import-data max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Importar Dados</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Importe suas transações de arquivos CSV com processamento inteligente brasileiro
        </p>
      </div>

      {/* Error Display */}
      {importError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 transition-colors">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Erro na Importação</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {importError}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setImportError(null)}
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {currentStep === 'upload' ? '1' : '✓'}
            </div>
            <div className={`text-sm font-medium ${
              currentStep === 'upload' ? 'text-blue-600' : 'text-green-600'
            }`}>
              Upload do Arquivo
            </div>
          </div>

          <div className={`h-1 flex-1 ${
            currentStep === 'upload' ? 'bg-gray-300' : 'bg-green-600'
          }`} />

          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep === 'mapping' ? 'bg-blue-600 text-white' :
            currentStep === 'preview' || currentStep === 'confirmation' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
          }`}>
            {currentStep === 'mapping' ? '2' : currentStep === 'preview' || currentStep === 'confirmation' ? '✓' : '2'}
          </div>
          <div className={`text-sm font-medium ${
            currentStep === 'mapping' ? 'text-blue-600' :
            currentStep === 'preview' || currentStep === 'confirmation' ? 'text-green-600' : 'text-gray-500'
          }`}>
            Mapeamento de Colunas
          </div>

          <div className={`h-1 flex-1 ${
            currentStep === 'preview' || currentStep === 'confirmation' ? 'bg-green-600' : 'bg-gray-300'
          }`} />

          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep === 'preview' ? 'bg-blue-600 text-white' :
            currentStep === 'confirmation' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
          }`}>
            {currentStep === 'preview' ? '3' : currentStep === 'confirmation' ? '✓' : '3'}
          </div>
          <div className={`text-sm font-medium ${
            currentStep === 'preview' ? 'text-blue-600' :
            currentStep === 'confirmation' ? 'text-green-600' : 'text-gray-500'
          }`}>
            Visualização e Validação
          </div>

          <div className={`h-1 flex-1 ${
            currentStep === 'confirmation' ? 'bg-green-600' : 'bg-gray-300'
          }`} />

          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep === 'confirmation' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
          }`}>
            {currentStep === 'confirmation' ? '4' : '4'}
          </div>
          <div className={`text-sm font-medium ${
            currentStep === 'confirmation' ? 'text-blue-600' : 'text-gray-500'
          }`}>
            Confirmação
          </div>
        </div>
      </div>

      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drag and Drop Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Upload do Arquivo CSV
              </h3>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? isDragAccept
                      ? 'border-green-500 bg-green-50'
                      : isDragReject
                      ? 'border-red-500 bg-red-50'
                      : 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isDragActive ? (
                  <p className="text-blue-600">
                    {isDragAccept ? 'Solte o arquivo CSV aqui...' : 'Arquivo não suportado'}
                  </p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">
                      Arraste e solte o arquivo CSV aqui, ou
                    </p>
                    <p className="text-blue-600 hover:text-blue-500">
                      clique para selecionar um arquivo
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Máximo: 10MB • Formatos: CSV
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Ou selecione manualmente:</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
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
                    {transactionCategories.income.slice(0, 6).map((cat) => (
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
                    {transactionCategories.expenses.slice(0, 6).map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLoadSampleData}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 w-full"
              >
                📥 Baixar Exemplo CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {currentStep === 'mapping' && columnMapping && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Mapeamento de Colunas
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Arquivo: {uploadedFile?.name}</span>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Trocar arquivo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Columns */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Colunas Obrigatórias</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data
                  </label>
                  <select
                    value={columnMapping.dateColumn}
                    onChange={(e) => handleColumnMappingUpdate({ dateColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <select
                    value={columnMapping.descriptionColumn}
                    onChange={(e) => handleColumnMappingUpdate({ descriptionColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor
                  </label>
                  <select
                    value={columnMapping.amountColumn}
                    onChange={(e) => handleColumnMappingUpdate({ amountColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Columns */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Colunas Opcionais</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria (se disponível)
                  </label>
                  <select
                    value={columnMapping.categoryColumn || ''}
                    onChange={(e) => handleColumnMappingUpdate({ categoryColumn: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Não mapear</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conta (se disponível)
                  </label>
                  <select
                    value={columnMapping.accountColumn || ''}
                    onChange={(e) => handleColumnMappingUpdate({ accountColumn: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Não mapear</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCurrentStep('preview')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continuar para Visualização →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Data Preview */}
      {currentStep === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Visualização e Validação
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToMapping}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Voltar para Mapeamento
                </button>
              </div>
            </div>

            {/* Import Summary */}
            {importSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{importSummary.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importSummary.valid}</div>
                  <div className="text-sm text-gray-600">Válidas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{importSummary.errors}</div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{importSummary.warnings}</div>
                  <div className="text-sm text-gray-600">Avisos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{importSummary.duplicates}</div>
                  <div className="text-sm text-gray-600">Duplicatas</div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">
                Preview (primeiras 10 transações):
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Linha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, index) => (
                      <tr key={index} className={row.validation.isValid ? '' : 'bg-red-50'}>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.rowNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {row.parsedData?.date || row.originalRow[columnMapping?.dateColumn || '']}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {row.parsedData?.description || row.originalRow[columnMapping?.descriptionColumn || '']}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.parsedData ? (
                            <span className={`font-medium ${
                              row.parsedData.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              R$ {Math.abs(row.parsedData.amount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {row.originalRow[columnMapping?.amountColumn || '']}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {row.parsedData ? (
                            getCategoryById(row.parsedData.category)?.name || row.parsedData.category
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.validation.isValid ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Válido
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ✗ Erro
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error Details */}
            {previewRows.some(row => !row.validation.isValid) && (
              <div className="mb-6">
                <h4 className="font-medium text-red-700 mb-2">Erros Encontrados:</h4>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-32 overflow-y-auto">
                  <ul className="text-sm text-red-800 space-y-1">
                    {previewRows
                      .filter(row => !row.validation.isValid)
                      .slice(0, 10)
                      .map((row, index) => (
                        <li key={index}>
                          Linha {row.rowNumber}: {row.validation.errors.join(', ')}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleBackToMapping}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ← Voltar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importSummary?.valid === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Confirmar Importação ({importSummary?.valid || 0} transações)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 'confirmation' && (
        <div className="space-y-6">
          {importResults && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Importação Concluída
              </h3>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Importação realizada com sucesso!
                </h4>
                <p className="text-gray-600">
                  {importResults.imported} de {importResults.total} transações foram importadas
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                  <div className="text-sm text-gray-600">Total de Linhas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                  <div className="text-sm text-gray-600">Importadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                  <div className="text-sm text-gray-600">Ignoradas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-red-700 mb-2">Erros encontrados:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-32 overflow-y-auto">
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
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">Transações Importadas (Exemplo):</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((transaction, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{transaction.date}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{transaction.description}</td>
                            <td className={`px-4 py-2 text-sm font-medium ${
                              transaction.amount > 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              R$ {Math.abs(transaction.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {getCategoryById(transaction.category)?.name || transaction.category}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Importar Novo Arquivo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 transition-colors">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-900 dark:text-gray-100">Processando arquivo...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
