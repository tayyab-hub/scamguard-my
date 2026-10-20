"""Render dated, evidence-bounded report figures without modifying historical figures."""
from pathlib import Path
import json
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parents[3]
figures = root / "docs/figures"
evidence = json.loads((root / "docs/evidence/completion-verification.json").read_text())
counts = evidence["counts"]
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 12})
fig, ax = plt.subplots(figsize=(10.5, 4.3), layout="constrained")
labels = ["Backend", "Frontend", "Browser"]
values = [counts["pytest_passed"], counts["vitest_passed"], sum(counts[k] for k in counts if k.startswith("playwright_"))]
bars = ax.barh(labels, values, color=["#B5452B", "#5C7D55", "#506E80"], height=.55)
ax.bar_label(bars, padding=8, fontsize=15, weight="bold")
ax.invert_yaxis()
ax.set_xlim(0, 410)
ax.set_xlabel("Passing test cases (different scopes; not accuracy)")
ax.set_title("October completion verification", loc="left", weight="bold", pad=15)
ax.spines[["top", "right", "left"]].set_visible(False)
ax.grid(axis="x", color="#E8E3DB")
ax.set_axisbelow(True)
fig.text(.02, -.04, "Backend: one opt-in live-AI skip. Browser: 18 foundation + 8 preview + 26 PostgreSQL.", fontsize=10)
fig.savefig(figures / "completion-tests.png", dpi=180, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(11, 4.8), layout="constrained")
phases = [("O1  Identify requirements", 1, 3, "#5C7D55"),
          ("O2  Design", 2, 3, "#5C7D55"),
          ("O3  Develop and deploy", 3, 9, "#B5452B"),
          ("O4  Evaluate", 9, 11, "#506E80")]
for i, (label, start, end, color) in enumerate(phases):
    ax.barh(i, end-start+1, left=start-.5, color=color, height=.52)
    ax.text((start+end)/2, i, f"Weeks {start}–{end}", ha="center", va="center", color="white", weight="bold")
ax.set_yticks(range(4), [v[0] for v in phases])
ax.invert_yaxis()
ax.set_xticks(range(1, 13))
ax.set_xlim(.5, 12.5)
ax.set_xlabel("Proposed project week · 1 September–20 November 2026")
ax.set_title("Proposal plan — not actual completion dates", loc="left", weight="bold", pad=18)
ax.spines[["top", "right", "left"]].set_visible(False)
ax.grid(axis="x", color="#E8E3DB")
ax.set_axisbelow(True)
fig.text(.02, -.03, "O4 technical evaluation is evidenced; volunteer study remains outstanding. Report/presentation planned by 18/20 November.", fontsize=10)
fig.savefig(figures / "completion-plan.png", dpi=180, bbox_inches="tight")
plt.close(fig)
print("Created completion-tests.png and completion-plan.png.")
