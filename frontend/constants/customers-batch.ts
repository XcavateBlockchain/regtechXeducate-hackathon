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
        id: "b1q1",
        text: "What was the main purpose of the FCA Discussion Paper DP18/5?",
        type: "SINGLE_CHOICE",
        explanation:
          "The paper aimed to explore whether a duty of care or alternative approaches were needed.",
        points: 1,
        sortOrder: 1,
        options: [
          {
            id: "a",
            text: "To introduce new taxes",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "To explore consumer protection improvements",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "To remove existing regulations",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "To regulate banks only",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
      {
        id: "b1q2",
        text: "Most respondents believed that consumer harm in financial services is high.",
        type: "TRUE_FALSE",
        explanation:
          "The majority agreed that harm levels are unacceptably high.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b1q3",
        text: "Which group is NOT listed as being affected by the FCA feedback statement?",
        type: "SINGLE_CHOICE",
        explanation: "Gamers were not listed among stakeholders.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Consumer groups", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Policy makers", isCorrect: false, sortOrder: 2 },
          { id: "c", text: "Gamers", isCorrect: true, sortOrder: 3 },
          { id: "d", text: "Regulated firms", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b1q4",
        text: "The FCA aimed to balance firm responsibility with consumer responsibility.",
        type: "TRUE_FALSE",
        explanation:
          "The document explicitly mentions balancing responsibilities.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b1q5",
        text: "What does 'New Duty' refer to in the document?",
        type: "SINGLE_CHOICE",
        explanation: "It includes a duty of care or alternative approaches.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "A tax policy", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "A legal punishment",
            isCorrect: false,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Duty of care or alternative approaches",
            isCorrect: true,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "A banking product",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
    ],
  },
  {
    id: "batch2",
    questions: [
      {
        id: "b2q1",
        text: "What is a key argument in favor of a New Duty?",
        type: "SINGLE_CHOICE",
        explanation: "It could drive cultural change in firms.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Increase taxes", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Drive cultural change",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Reduce competition",
            isCorrect: false,
            sortOrder: 3,
          },
          { id: "d", text: "Eliminate firms", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b2q2",
        text: "Some stakeholders believe SM&CR already addresses needed changes.",
        type: "TRUE_FALSE",
        explanation: "Many argue to wait and evaluate SM&CR impact.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b2q3",
        text: "What does SM&CR stand for?",
        type: "SINGLE_CHOICE",
        explanation: "It refers to Senior Managers and Certification Regime.",
        points: 1,
        sortOrder: 3,
        options: [
          {
            id: "a",
            text: "System Management Code Rule",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Senior Managers and Certification Regime",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Standard Market Compliance Rule",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "Service Monitoring Control Regulation",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
      {
        id: "b2q4",
        text: "A New Duty could help firms focus on doing what is right rather than just following rules.",
        type: "TRUE_FALSE",
        explanation: "This was a key cultural argument in favor.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b2q5",
        text: "Which benefit is associated with a New Duty?",
        type: "SINGLE_CHOICE",
        explanation: "It provides clarity for consumers.",
        points: 1,
        sortOrder: 5,
        options: [
          {
            id: "a",
            text: "Confusion in markets",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Clarity for consumers",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Higher litigation cost",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "Reduced transparency",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
    ],
  },
  {
    id: "batch3",
    questions: [
      {
        id: "b3q1",
        text: "Why do many stakeholders oppose a statutory duty of care?",
        type: "SINGLE_CHOICE",
        explanation: "They fear legal complexity and duplication.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Too simple", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Legal complexity", isCorrect: true, sortOrder: 2 },
          { id: "c", text: "Too cheap", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Lack of interest", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b3q2",
        text: "A statutory duty may reduce innovation due to increased caution.",
        type: "TRUE_FALSE",
        explanation: "Stakeholders feared it could make firms overly cautious.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b3q3",
        text: "What concern exists about litigation under a statutory duty?",
        type: "SINGLE_CHOICE",
        explanation: "It may cause stress and high costs.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Too fast", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Too cheap", isCorrect: false, sortOrder: 2 },
          { id: "c", text: "Stress and cost", isCorrect: true, sortOrder: 3 },
          { id: "d", text: "Too simple", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b3q4",
        text: "Some stakeholders believe a statutory duty would restore consumer trust.",
        type: "TRUE_FALSE",
        explanation: "Supporters see it as a way to rebuild trust.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b3q5",
        text: "Which is a risk of statutory duty?",
        type: "SINGLE_CHOICE",
        explanation: "It may reduce regulatory agility.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "More flexibility", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Reduced agility", isCorrect: true, sortOrder: 2 },
          { id: "c", text: "Better clarity", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Less regulation", isCorrect: false, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: "batch4",
    questions: [
      {
        id: "b4q1",
        text: "What is a common criticism of the FCA's current regulatory approach?",
        type: "SINGLE_CHOICE",
        explanation: "It is seen as too 'tick-box' oriented.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Too flexible", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "Too vague", isCorrect: false, sortOrder: 2 },
          { id: "c", text: "Tick-box approach", isCorrect: true, sortOrder: 3 },
          { id: "d", text: "Too fast", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b4q2",
        text: "Stakeholders want the FCA to act more proactively using Principles.",
        type: "TRUE_FALSE",
        explanation: "They want broader and earlier application of Principles.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b4q3",
        text: "What improvement do firms want from the FCA?",
        type: "SINGLE_CHOICE",
        explanation: "More transparency and guidance.",
        points: 1,
        sortOrder: 3,
        options: [
          {
            id: "a",
            text: "Less communication",
            isCorrect: false,
            sortOrder: 1,
          },
          { id: "b", text: "More transparency", isCorrect: true, sortOrder: 2 },
          { id: "c", text: "More penalties", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Less regulation", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b4q4",
        text: "Publishing good and bad practice examples is suggested as a transparency improvement.",
        type: "TRUE_FALSE",
        explanation: "This helps firms understand expectations.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: true, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: false, sortOrder: 2 },
        ],
      },
      {
        id: "b4q5",
        text: "What does better transparency help firms achieve?",
        type: "SINGLE_CHOICE",
        explanation: "It helps them improve practices.",
        points: 1,
        sortOrder: 5,
        options: [
          { id: "a", text: "Ignore rules", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Improve performance",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Reduce staff", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Avoid compliance", isCorrect: false, sortOrder: 4 },
        ],
      },
    ],
  },
  {
    id: "batch5",
    questions: [
      {
        id: "b5q1",
        text: "What is the key driver of real culture change according to stakeholders?",
        type: "SINGLE_CHOICE",
        explanation: "It must come from within firms.",
        points: 1,
        sortOrder: 1,
        options: [
          { id: "a", text: "Government only", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Internal firm leadership",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Customers", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Courts", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b5q2",
        text: "Regulatory intervention alone can fully achieve culture change.",
        type: "TRUE_FALSE",
        explanation: "Stakeholders said it cannot fully drive change.",
        points: 1,
        sortOrder: 2,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "b5q3",
        text: "What is a key next step for the FCA?",
        type: "SINGLE_CHOICE",
        explanation: "They plan further analysis and consultation.",
        points: 1,
        sortOrder: 3,
        options: [
          { id: "a", text: "Stop regulation", isCorrect: false, sortOrder: 1 },
          {
            id: "b",
            text: "Further consultation",
            isCorrect: true,
            sortOrder: 2,
          },
          { id: "c", text: "Remove all rules", isCorrect: false, sortOrder: 3 },
          { id: "d", text: "Close firms", isCorrect: false, sortOrder: 4 },
        ],
      },
      {
        id: "b5q4",
        text: "There is a one-size-fits-all solution to consumer harm.",
        type: "TRUE_FALSE",
        explanation: "The FCA states there is no single solution.",
        points: 1,
        sortOrder: 4,
        options: [
          { id: "a", text: "True", isCorrect: false, sortOrder: 1 },
          { id: "b", text: "False", isCorrect: true, sortOrder: 2 },
        ],
      },
      {
        id: "b5q5",
        text: "Which option is a primary focus for improving consumer protection?",
        type: "SINGLE_CHOICE",
        explanation: "Reviewing how the regulatory framework is applied.",
        points: 1,
        sortOrder: 5,
        options: [
          {
            id: "a",
            text: "Removing Principles",
            isCorrect: false,
            sortOrder: 1,
          },
          {
            id: "b",
            text: "Reviewing regulatory application",
            isCorrect: true,
            sortOrder: 2,
          },
          {
            id: "c",
            text: "Reducing transparency",
            isCorrect: false,
            sortOrder: 3,
          },
          {
            id: "d",
            text: "Eliminating firms",
            isCorrect: false,
            sortOrder: 4,
          },
        ],
      },
    ],
  },
];
