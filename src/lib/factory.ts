import type { Question, Walk } from "../types";
import { shortId, uid } from "./id";

export function newQuestion(stationNumber: number): Question {
  return {
    id: uid(),
    stationNumber,
    text: "",
    options: { "1": "", X: "", "2": "" },
    correct: "1",
  };
}

export function newWalk(): Walk {
  return {
    id: shortId(6),
    title: "",
    status: "draft",
    settings: { showQuestionText: true, printable: true },
    questions: [newQuestion(1)],
    createdAt: Date.now(),
  };
}
