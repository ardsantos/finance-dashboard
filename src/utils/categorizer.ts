import Fuse from "fuse.js";
import { Transaction } from "./storage";

// Brazilian merchant keywords database
export const brazilianKeywords = {
  alimentacao: [
    "restaurante",
    "lanchonete",
    "padaria",
    "supermercado",
    "mercado",
    "açougue",
    "peixaria",
    "hortifruti",
    "confeitaria",
    "pizzaria",
    "churrascaria",
    "fast food",
    "delivery",
    "ifood",
    "rappi",
    "food",
    "lanche",
    "janta",
    "almoço",
    "café",
    "carrefour",
    "pão de açúcar",
    "extra",
    "wal-mart",
    "atacarejo",
    "assai",
    "mcdonalds",
    "burger king",
    "habbibs",
    "outback",
    "pizza hut",
    "domino",
  ],
  transporte: [
    "uber",
    "99 taxi",
    "cabify",
    "posto",
    "gasolina",
    "etanol",
    "álcool",
    "gnv",
    "estacionamento",
    "pedágio",
    "uberx",
    "uber select",
    "comfort",
    "taxi",
    "metrô",
    "onibus",
    "ônibus",
    "trem",
    "bike",
    "patinete",
    "condução",
    "auto escola",
    "detran",
    "ipiranga",
    "shell",
    "texaco",
    "petrobras",
    "br",
    "loja auto",
    "pecas",
    "pneus",
    "oficina",
    "lavajato",
    "auto peças",
  ],
  moradia: [
    "aluguel",
    "condomínio",
    "financiamento",
    "iptu",
    "água",
    "luz",
    "energia",
    "saneamento",
    "sabesp",
    "light",
    "eletropaulo",
    "cemig",
    "copel",
    "celg",
    "reparo",
    "construção",
    "reforma",
    "material construção",
    "loja de tintas",
    "imobiliária",
    "imóvel",
    "casa",
    "apartamento",
    "edifício",
    " condomínio",
    "seguro residencial",
    "seguro casa",
    "mobília",
    "decoração",
    "moveis planejados",
  ],
  saude: [
    "farmácia",
    "drogaria",
    "droga raia",
    "pacheco",
    "panvel",
    "medicamento",
    "médico",
    "dentista",
    "psicólogo",
    "nutricionista",
    "academia",
    "personal",
    "plano de saúde",
    "unimed",
    "amil",
    "bradesco saúde",
    "sulamerica",
    "hospital",
    "clínica",
    "laboratório",
    "exame",
    "consulta",
    "sessão",
    "fisioterapeuta",
    "ortopedista",
    "cardiologista",
    "ginecologista",
  ],
  lazer: [
    "netflix",
    "spotify",
    "prime video",
    "hbo max",
    "disney+",
    "star+",
    "cinema",
    "teatro",
    "show",
    "festival",
    "parque",
    "praia",
    "clube",
    "viagem",
    "hotel",
    "pousada",
    "airbnb",
    "booking",
    "decolar",
    "cvc",
    "game",
    "steam",
    "playstation",
    "xbox",
    "nintendo",
    "livraria",
    "livro",
    "bar",
    "boate",
    "balada",
    "festa",
    "casino",
    "bingo",
    "loteria",
  ],
  compras: [
    "mercado livre",
    "americanas",
    "magazine luiza",
    "casas bahia",
    "fast shop",
    "riachuelo",
    "renner",
    "c&a",
    "lojas",
    "shopping",
    "iguatemi",
    "center",
    "roupas",
    "calçados",
    "bolsas",
    "acessórios",
    "eletrônicos",
    "celular",
    "computador",
    "notebook",
    "tv",
    "smartphone",
    "fone",
    "headphone",
    "presente",
    "brinquedo",
    "cosméticos",
    "perfume",
    "joias",
    "relógio",
  ],
  educacao: [
    "escola",
    "faculdade",
    "universidade",
    "curso",
    "pós-graduação",
    "mestrado",
    "doutorado",
    "especialização",
    "livro didático",
    "material escolar",
    "mensalidade",
    "anuidade",
    "matrícula",
    "aula particular",
    "professor particular",
    "idiomas",
    "cursinho",
    "vestibular",
    "enem",
    "educação infantil",
    "creche",
    "berçário",
  ],
  servicos: [
    "net",
    "fibra",
    "internet",
    "wifi",
    "celular",
    "vivo",
    "tim",
    "claro",
    "oi",
    "netflix",
    "spotify",
    "assinatura",
    "mensalidade",
    "conta",
    "plano",
    "seguro",
    "previdência",
    "banco",
    "itau",
    "bradesco",
    "caixa",
    "santander",
    "nubank",
    "inter",
    "picpay",
    "recarga",
    "cartão",
    "anuidade cartão",
  ],
  salario: [
    "salário",
    "salario",
    "holerite",
    "contracheque",
    "pagamento",
    "renda",
    "ordenado",
    "vencimento",
    "crédito salário",
    "depósito salário",
  ],
  freelance: [
    "freelance",
    "freela",
    "pj",
    "pessoa jurídica",
    "consultoria",
    "serviços",
    "projeto",
    "desenvolvimento",
    "design",
    "programação",
    "honorários",
  ],
  investimentos: [
    "tesouro direto",
    "cdb",
    "lci",
    "lca",
    "fundo",
    "renda fixa",
    "ações",
    "bolsa",
    "xp investimentos",
    "nuinvest",
    "rico",
    "clear",
    "inter invest",
    "dividendo",
    "juros",
    "rentabilidade",
    "aplicação",
    "resgate",
  ],
  outras_receitas: [
    "presente",
    "doação",
    "prêmio",
    "sorteio",
    "loteria",
    "bolão",
    "reembolso",
    "estorno",
    "devolução",
    "cashback",
    "milhas",
    "bônus",
  ],
};

// Learning system interface
export interface CategorizationRule {
  keyword: string;
  categoryId: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
}

// Categorization result
export interface CategorizationResult {
  categoryId: string;
  confidence: number;
  matchedKeywords: string[];
  method: "exact" | "fuzzy" | "learned";
}

// Fuzzy matching options
const fuzzyOptions = {
  threshold: 0.6, // Lower threshold = more permissive matching
  distance: 100,
  keys: ["keyword"],
  minMatchCharLength: 2,
  ignoreLocation: true,
};

// Create Fuse instance for fuzzy matching
let fuseInstance: Fuse<CategorizationRule> | null = null;

// Initialize fuzzy search with learned rules
const initializeFuzzySearch = (rules: CategorizationRule[]): void => {
  fuseInstance = new Fuse(rules, fuzzyOptions);
};

// Load learned rules from localStorage
export const loadLearnedRules = (): CategorizationRule[] => {
  try {
    const rules = localStorage.getItem("finance_categorization_rules");
    return rules ? JSON.parse(rules) : [];
  } catch (error) {
    console.warn("Failed to load learned rules:", error);
    return [];
  }
};

// Save learned rules to localStorage
export const saveLearnedRules = (rules: CategorizationRule[]): void => {
  try {
    localStorage.setItem("finance_categorization_rules", JSON.stringify(rules));
  } catch (error) {
    console.warn("Failed to save learned rules:", error);
  }
};

// Add a new learned rule from user correction
export const addLearnedRule = (keyword: string, categoryId: string): void => {
  const rules = loadLearnedRules();

  // Check if rule already exists
  const existingRuleIndex = rules.findIndex(
    (rule) =>
      rule.keyword.toLowerCase() === keyword.toLowerCase() &&
      rule.categoryId === categoryId
  );

  if (existingRuleIndex >= 0) {
    // Update existing rule
    rules[existingRuleIndex].usageCount++;
    rules[existingRuleIndex].lastUsed = new Date().toISOString();
    rules[existingRuleIndex].confidence = Math.min(
      1,
      rules[existingRuleIndex].confidence + 0.1
    );
  } else {
    // Add new rule
    const newRule: CategorizationRule = {
      keyword: keyword.toLowerCase(),
      categoryId,
      confidence: 0.7, // Start with good confidence for user corrections
      usageCount: 1,
      lastUsed: new Date().toISOString(),
    };
    rules.push(newRule);
  }

  saveLearnedRules(rules);
  initializeFuzzySearch(rules);
};

// Get category by keyword from predefined database
const getCategoryByKeyword = (
  description: string
): CategorizationResult | null => {
  const normalizedDescription = description.toLowerCase();

  for (const [categoryId, keywords] of Object.entries(brazilianKeywords)) {
    for (const keyword of keywords) {
      if (normalizedDescription.includes(keyword)) {
        return {
          categoryId,
          confidence: 0.9, // High confidence for exact matches
          matchedKeywords: [keyword],
          method: "exact",
        };
      }
    }
  }

  return null;
};

// Get category using fuzzy matching
const getCategoryByFuzzy = (
  description: string,
  rules: CategorizationRule[]
): CategorizationResult | null => {
  if (!fuseInstance || rules.length === 0) return null;

  const results = fuseInstance.search(description);
  if (results.length > 0) {
    const match = results[0];
    return {
      categoryId: match.item.categoryId,
      confidence: match.score
        ? Math.max(0.3, 1 - match.score) * match.item.confidence
        : 0.5,
      matchedKeywords: [match.item.keyword],
      method: "fuzzy",
    };
  }

  return null;
};

// Main categorization function
export const categorizeTransaction = (
  description: string
): CategorizationResult => {
  if (!description || description.trim().length < 2) {
    return {
      categoryId: "outros",
      confidence: 0.1,
      matchedKeywords: [],
      method: "exact",
    };
  }

  // Load learned rules and initialize fuzzy search
  const learnedRules = loadLearnedRules();
  if (!fuseInstance) {
    initializeFuzzySearch(learnedRules);
  }

  // Try exact matching first (highest confidence)
  const exactMatch = getCategoryByKeyword(description);
  if (exactMatch) {
    return exactMatch;
  }

  // Try learned rules with fuzzy matching
  const fuzzyMatch = getCategoryByFuzzy(description, learnedRules);
  if (fuzzyMatch && fuzzyMatch.confidence > 0.4) {
    return fuzzyMatch;
  }

  // Default categorization
  return {
    categoryId: "outros",
    confidence: 0.1,
    matchedKeywords: [],
    method: "exact",
  };
};

// Batch categorization for multiple transactions
export const categorizeTransactions = (
  transactions: Transaction[]
): (Transaction & CategorizationResult)[] => {
  return transactions.map((transaction) => ({
    ...transaction,
    ...categorizeTransaction(transaction.description),
  }));
};

// Get suggested categories for user selection
export const getSuggestedCategories = (
  description: string,
  limit: number = 3
): string[] => {
  const result = categorizeTransaction(description);

  // Return the matched category and similar ones
  const learnedRules = loadLearnedRules();
  if (!fuseInstance) {
    initializeFuzzySearch(learnedRules);
  }

  const suggestions = [result.categoryId];

  if (fuseInstance && learnedRules.length > 0) {
    const similarResults = fuseInstance.search(description, { limit });
    similarResults.forEach((result) => {
      if (!suggestions.includes(result.item.categoryId)) {
        suggestions.push(result.item.categoryId);
      }
    });
  }

  return suggestions.slice(0, limit);
};

// Learn from user corrections
export const learnFromCorrection = (
  originalDescription: string,
  correctCategoryId: string
): void => {
  // Extract keywords from description (simplified approach)
  const words = originalDescription
    .toLowerCase()
    .replace(/[^\w\sÀ-ÖØ-öø-ÿ]/g, "") // Keep Portuguese characters
    .split(/\s+/)
    .filter((word) => word.length > 2);

  // Add each word as a potential keyword
  words.forEach((word) => {
    addLearnedRule(word, correctCategoryId);
  });

  // Also add the full description
  addLearnedRule(originalDescription.toLowerCase(), correctCategoryId);
};

// Get categorization statistics
export const getCategorizationStats = () => {
  const rules = loadLearnedRules();
  const stats = {
    totalRules: rules.length,
    rulesByCategory: {} as Record<string, number>,
    averageConfidence: 0,
    mostUsedKeywords: [] as { keyword: string; usageCount: number }[],
  };

  if (rules.length === 0) return stats;

  // Calculate rules by category
  rules.forEach((rule) => {
    stats.rulesByCategory[rule.categoryId] =
      (stats.rulesByCategory[rule.categoryId] || 0) + 1;
  });

  // Calculate average confidence
  const totalConfidence = rules.reduce((sum, rule) => sum + rule.confidence, 0);
  stats.averageConfidence = totalConfidence / rules.length;

  // Get most used keywords
  stats.mostUsedKeywords = rules
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)
    .map((rule) => ({ keyword: rule.keyword, usageCount: rule.usageCount }));

  return stats;
};
