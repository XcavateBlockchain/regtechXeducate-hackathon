type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE";
export interface QuestionOptionInput {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}
export interface QuestionInput {
  id: string;
  text: string;
  type: QuestionType;
  explanation?: string;
  points: number;
  sortOrder: number;
  options: QuestionOptionInput[];
}

type Batch = {
  id: string;
  questions: QuestionInput[];
};

export const batches: Batch[] = [
  {
    id: "batch1",
    questions: [
      {
        id: "q1",
        text: "What does a price graph primarily show?",
        type: "SINGLE_CHOICE",
        explanation:
          "A price graph shows how the price of an investment changes over time.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Company profits", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Price changes over time",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Number of investors",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "Market regulations",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
      {
        id: "q2",
        text: "Price graphs can help assess the volatility of a stock.",
        type: "TRUE_FALSE",
        explanation: "They show fluctuations which indicate volatility.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "q3",
        text: "What is a stock ticker symbol?",
        type: "SINGLE_CHOICE",
        explanation: "It is a unique abbreviation used to identify a stock.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Company logo", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Stock abbreviation",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Trading price", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Market index", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q4",
        text: "The closing price is the last traded price during market hours.",
        type: "TRUE_FALSE",
        explanation:
          "Closing price refers to the last price recorded before the market closes.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "q5",
        text: "Why should you double-check ticker symbols?",
        type: "SINGLE_CHOICE",
        explanation: "Different companies may share the same symbol.",
        points: 1,
        sortOrder: 5,
        options: [
          {
            id: "a",
            text: "They change daily",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "They can be duplicated across markets",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "They are random", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "They expire", isCorrect: false, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: "batch2",
    questions: [
      {
        id: "q6",
        text: "What does the x-axis typically represent on a price graph?",
        type: "SINGLE_CHOICE",
        explanation: "It usually represents time.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Price", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Time", isCorrect: true, sortOrder: 2 },
          { id: "c", text: "Volume", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Profit", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q7",
        text: "Hype can sometimes misrepresent investment performance.",
        type: "TRUE_FALSE",
        explanation: "Graphs may highlight gains while hiding risks.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "q8",
        text: "What is a red flag when evaluating an investment?",
        type: "SINGLE_CHOICE",
        explanation:
          "Only showing past success without risks is a warning sign.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Balanced data", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Only past strong performance highlighted",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Detailed reports", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Regulated advice", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q9",
        text: "Past performance guarantees future success.",
        type: "TRUE_FALSE",
        explanation:
          "There is no guarantee future performance will match the past.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "q10",
        text: "What should you use alongside price graphs?",
        type: "SINGLE_CHOICE",
        explanation: "Multiple reliable sources should be used.",
        points: 1,
        sortOrder: 5,
        options: [
          {
            id: "a",
            text: "Only social media",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Multiple trusted sources",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Friends advice only",
            isCorrect: false,
            sortOrder: 3,
          },
          { id: "d", text: "Random blogs", isCorrect: false, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: "batch3",
    questions: [
      {
        id: "q11",
        text: "AI tools are always accurate.",
        type: "TRUE_FALSE",
        explanation: "AI can produce incorrect or outdated information.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "q12",
        text: "What is an AI hallucination?",
        type: "SINGLE_CHOICE",
        explanation: "It is when AI generates incorrect information.",
        points: 1,
        sortOrder: 2,
        options: [
          {
            id: "a",
            text: "Correct prediction",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Generated false information",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Real-time update", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Verified fact", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q13",
        text: "AI can replace all investment research.",
        type: "TRUE_FALSE",
        explanation: "AI should support, not replace research.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "q14",
        text: "What is a benefit of using AI in research?",
        type: "SINGLE_CHOICE",
        explanation: "AI can simplify complex information.",
        points: 1,
        sortOrder: 4,
        options: [
          {
            id: "a",
            text: "Guarantees profits",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Simplifies complex topics",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Predicts future", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Eliminates risk", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q15",
        text: "AI advice is always regulated.",
        type: "TRUE_FALSE",
        explanation: "General AI tools are not regulated financial advisors.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
    ],
  },
  {
    id: "batch4",
    questions: [
      {
        id: "q16",
        text: "What is the first stage of a pump and dump scheme?",
        type: "SINGLE_CHOICE",
        explanation: "False hype is spread to increase price.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Selling shares", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Spreading hype", isCorrect: true, sortOrder: 2 },
          { id: "c", text: "Market crash", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Regulation", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q17",
        text: "Pump and dump schemes are legal.",
        type: "TRUE_FALSE",
        explanation: "They are illegal market manipulation.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "q18",
        text: "What happens during the 'dump' phase?",
        type: "SINGLE_CHOICE",
        explanation: "Promoters sell at high prices causing a crash.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Prices increase", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Shares are sold quickly",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Investors buy more",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "Market stabilizes",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
      {
        id: "q19",
        text: "Pump and dump schemes often rely on hype and urgency.",
        type: "TRUE_FALSE",
        explanation: "They use pressure tactics to rush decisions.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "q20",
        text: "Which is a red flag of a pump and dump?",
        type: "SINGLE_CHOICE",
        explanation: "Unexplained rapid price increases are suspicious.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "Stable price", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Sudden unexplained spike",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Official news", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Long-term growth", isCorrect: false, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: "batch5",
    questions: [
      {
        id: "q21",
        text: "Group chats promoting investments can be a warning sign.",
        type: "TRUE_FALSE",
        explanation: "They are often used in pump and dump schemes.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "q22",
        text: "What should you do before investing?",
        type: "SINGLE_CHOICE",
        explanation: "Always conduct independent research.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "Follow hype", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Do your own research",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Trust strangers", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Act quickly", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q23",
        text: "Guaranteed returns are a safe investment sign.",
        type: "TRUE_FALSE",
        explanation: "Guaranteed returns are a major red flag.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "q24",
        text: "What should you do if pressured to invest quickly?",
        type: "SINGLE_CHOICE",
        explanation: "Avoid rushing and investigate further.",
        points: 1,
        sortOrder: 4,
        options: [
          {
            id: "a",
            text: "Invest immediately",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Take time to research",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Ignore risks", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Follow others", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "q25",
        text: "You can lose all your money in a pump and dump scheme.",
        type: "TRUE_FALSE",
        explanation: "These schemes often leave investors with losses.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
    ],
  },
];
