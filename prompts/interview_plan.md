Build an interview plan for a live process interview.

Input: the intake form (company, the processes they want examined, the interviewee's name and role, notes) and any attached files (SOPs, screenshots, exports).

Return:
<plan>
{"processes":[{"key":"kebab-case","name":"...","why_it_matters":"from intake, or null",
  "known":["facts already in the files, so you don't re-ask them"],
  "slots":{"trigger":"open","steps":"open","handoffs":"open","outputs":"open","defects":"open","exceptions":"open","metrics":"open","pain":"open"},
  "opening_question":"a friendly first question about this process",
  "probes":["at most 6 specific follow-ups suggested by the files or intake"]}],
 "time_split":{"<key>":minutes}}
</plan>

Rules: plan at most 3 processes for 45 minutes, using the order the intake implies. Mark a slot "partial" when the files already answer part of it. Never put personal data from the files into the plan.
