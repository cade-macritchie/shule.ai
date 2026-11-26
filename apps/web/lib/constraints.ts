// The five business constraints shule is marketed and scoped around (Theory of Constraints framing:
// find the one thing limiting the school, fix that first). Shared by the site, intake and portal.
export const CONSTRAINTS = [
  {
    id: "enrollment",
    title: "Not enough students",
    symptom: "Inquiries come in, but too few become enrolled students.",
    lookAt: "Inquiry follow-up, visits, applications, admission decisions, deposits and the first day: every handoff a family goes through.",
    know: "Conversion and days between each stage, and where families drop off.",
  },
  {
    id: "margin",
    title: "Students aren't profitable enough",
    symptom: "Every seat is full of work, but the budget still doesn't close.",
    lookAt: "The cost to serve each student: admin hours, aid and discount decisions, re-enrollment, scheduling and class sizes.",
    know: "Net tuition against the real cost to serve, and the margin per student.",
  },
  {
    id: "teachers",
    title: "Can't find and keep good teachers",
    symptom: "Roles stay open for months, and good people leave tired.",
    lookAt: "The hiring pipeline from posting to first day, onboarding, and the admin work that pulls teachers away from teaching.",
    know: "Time to hire, offer acceptance, and the hours a week teachers lose to admin.",
  },
  {
    id: "experience",
    title: "Can't match better-funded schools on experience",
    symptom: "Bigger schools feel smoother and more personal to families.",
    lookAt: "The family journey: response times, visits, onboarding and communication, and the handoffs families can feel.",
    know: "Response times, handoffs per family, and where things get dropped. Experience is a process, not a budget.",
  },
  {
    id: "cac",
    title: "Don't know what a student costs to win",
    symptom: "You spend on marketing and recruiting, but can't say what each new student costs.",
    lookAt: "Marketing and recruiting spend, staff time, and the counts at every stage of the funnel.",
    know: "Cost to acquire each student (CAC), conversion by stage, and how long tuition takes to pay it back.",
  },
] as const;

export type ConstraintId = (typeof CONSTRAINTS)[number]["id"];
export const CONSTRAINT_IDS = CONSTRAINTS.map(c => c.id) as [ConstraintId, ...ConstraintId[]];
export const constraintTitle = (id: string) => CONSTRAINTS.find(c => c.id === id)?.title ?? id;
