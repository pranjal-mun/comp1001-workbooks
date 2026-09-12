"""Build workbooks/lecture-03/exercises.json.

Lecture 3 has one supplied Python script and no Python writing. Every
transcript on the page and every trace value in the answer keys is produced
by running that script, so the specs cannot drift from Python's behaviour.
Run from anywhere:

    python3 workbooks/lecture-03/build_exercises.py
    python3 tools/check_workbook.py workbooks/lecture-03
"""
import base64, json, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
NBSP = " "

def b64(text):
    return base64.b64encode(text.rstrip("\n").encode()).decode()

def run(code, inputs=()):
    p = subprocess.run([sys.executable, "-c", code], input="\n".join(inputs) + ("\n" if inputs else ""), capture_output=True, text=True)
    assert p.returncode == 0, p.stderr
    return p.stdout.rstrip("\n")

def example(code, output=True, **kw):
    spec = {"type": "example", "code": code.rstrip("\n"), **kw}
    if output:
        spec["output"] = run(code)
    return spec

def money(cents):
    return f"{cents / 100:.2f}"

def dollars(cents):
    """Accepted spellings of a dollar amount: 8.02, $8.02, CA$8.02."""
    m = money(cents)
    return [m, f"${m}", f"CA${m}", f"CA$ {m}"]

E = {}

# ------------------------------------------------- The supplied script
# Byte-for-byte the listing in LECTURE_03_SHARED_CONTENT.tex (also on
# slides 18 and 22). The instructor asked for integer-cent arithmetic
# rather than the decimal module; see the kit's HANDOFF_ISSUES.md.
PIZZA = '''prices = input("Pizza prices: ").split()
tip = float(input("Agreed tip: "))
people = float(input("People: "))
if people < 1 or people != int(people):
    print("Enter a whole number of people"
          " of at least 1")
else:
    people = int(people)
    food = sum(map(float, prices))
    subtotal = round((food + 10) * 100)  # cents
    tax = (subtotal * 15 + 50) // 100  # half-up
    tip = round(tip * 100)
    total = subtotal + tax + tip
    while total % people:
        tip += 1
        total += 1
    print(f"Final tip: CA${tip/100:.2f}")
    print(f"Total: CA${total/100:.2f}")
    print(f"Each: CA${total/people/100:.2f}")
'''
E["ex-pizza"] = example(PIZZA, output=False, title="pizza.py")
E["ex-pizza-run"] = example(PIZZA, output=False, title="pizza.py")

def pizza(prices, tip, people):
    """Run the supplied script with these answers; return its result lines.

    With piped stdin the three prompts are printed on the first line with
    no newline after them (IDLE echoes the typed answer instead), so strip
    the prompt text before comparing.
    """
    out = run(PIZZA, [prices, tip, people])
    for prompt in ("Pizza prices: ", "Agreed tip: ", "People: "):
        assert out.startswith(prompt), out
        out = out[len(prompt):]
    return out.split("\n")

# The four Shell interactions printed in the workbook. The page shows them as
# static transcripts; assert here that the script really prints them.
TRANSCRIPTS = {
    "3": ["Final tip: CA$8.02", "Total: CA$100.02", "Each: CA$33.34"],
    "4": ["Final tip: CA$8.00", "Total: CA$100.00", "Each: CA$25.00"],
    "1": ["Final tip: CA$8.00", "Total: CA$100.00", "Each: CA$100.00"],
    "0": ["Enter a whole number of people of at least 1"],
}
for people, expected in TRANSCRIPTS.items():
    got = pizza("25 25 20", "8", people)
    assert got == expected, (people, got)
assert pizza("25 25 20", "8", "2.5") == TRANSCRIPTS["0"]

# ------------------------------------------------- Final Practice
E["fp1"] = {"type": "short", "xp": 2, "rows": 5, "answer": b64(
    "One person passes the check and pays the entire final bill. Zero and 2.5 do not describe an allowed group. "
    "Each produces the message “Enter a whole number of people of at least 1” and stops. "
    "Checking first avoids trying to calculate a payment for a group outside the agreement. "
    "For the familiar order, the one-person result is tip CA$8.00, total CA$100.00, payment CA$100.00.")}

# Practice 2: trace the adjustment for nine people, one row per check. The
# key is derived from the same arithmetic the script performs.
def trace(total, tip, people):
    rows = []
    while True:
        needs = bool(total % people)
        rows.append((total, tip, needs))
        if not needs:
            break
        total += 1
        tip += 1
    return rows

nine = trace(10000, 800, 9)
assert len(nine) == 9 and nine[-1] == (10008, 808, False)
assert pizza("25 25 20", "8", "9") == ["Final tip: CA$8.08", "Total: CA$100.08", "Each: CA$11.12"]
blanks = {}
for i, (total, tip, needs) in enumerate(nine, start=1):
    if i > 1:  # the first row's amounts are given in the question
        blanks[f"t{i}"] = {"accept": [str(total)], "placeholder": "cents", "width": "6rem"}
        blanks[f"p{i}"] = {"accept": [str(tip)], "placeholder": "cents", "width": "6rem"}
    blanks[f"n{i}"] = {"accept": ["Yes"] if needs else ["No"], "placeholder": "Yes / No", "width": "6rem"}
E["fp2-trace"] = {"type": "table", "xp": 1, "blanks": blanks}
E["fp2-final"] = {"type": "table", "xp": 2, "blanks": {
    "tip": {"accept": dollars(808), "placeholder": "CA$", "width": "8rem"},
    "total": {"accept": dollars(10008), "placeholder": "CA$", "width": "8rem"},
    "each": {"accept": dollars(10008 // 9), "placeholder": "CA$", "width": "8rem"}}}
assert 10008 // 9 == 1112
E["fp2-check"] = {"type": "short", "xp": 2, "rows": 2, "minChars": 12,
    "placeholder": "Show the multiplication and the addition that confirm the bill…",
    "answer": b64("Check: 9 × 11.12 = 100.08; also 80 + 12 + 8.08 = 100.08. "
                  "The nine payments cover the revised total, and subtotal, rounded tax and final tip add to that same total.")}

pseudo = [
    "WHILE total needs adjustment",
    NBSP * 4 + "ADD 1 cent to total",
    NBSP * 4 + "ADD 1 cent to tip",
    "END WHILE",
    "SET payment TO total divided by people",
    "DISPLAY final tip, total and payment",
    NBSP * 8 + "in dollars and cents",
]
E["fp3"] = {"type": "short", "xp": 5, "rows": 8, "minChars": 40,
    "placeholder": "WHILE …\n    ADD …\n…",
    "answer": b64("An acceptable pseudocode solution is:\n\n" + "\n\n".join(f"`{line}`" for line in pseudo) + "\n\n"
                  "For four people, the first check is false, so the tip stays CA$8.00 and each pays CA$25.00. "
                  "For three, both amounts increase twice: tip CA$8.02, total CA$100.02 and each CA$33.34. "
                  "The condition is checked before the first addition, so the method handles both cases. "
                  "Equivalent wording is acceptable if both updates happen before the next check.")}

E["fp4"] = {"type": "short", "xp": 5, "rows": 6, "minChars": 40,
    "placeholder": "Draw the chart on paper first. Then list each shape, its label, and where each exit goes…",
    "answer": b64("The chart is the one in “A repeated action” above: a diamond “Does the total still need adjustment?” with two labelled exits. "
                  "The Yes path goes to an action box “Add 1 cent to total. Add 1 cent to tip.” whose arrow returns to the decision. "
                  "The No path goes to an input/output shape “Calculate payment. Report final amounts.”\n\n"
                  "For three people, follow Yes at 10000 cents, Yes at 10001, then No at 10002. "
                  "The final tip is CA$8.02 and each payment is CA$33.34.")}

E["fp5-idle"] = {"type": "short", "xp": 2, "rows": 4, "answer": b64(
    "Open the script in IDLE’s editor, use File → Save As to save a working copy, and select Run → Run Module. "
    "Enter the requested values in the Shell; the result appears there too. Opening the file alone does not run it.")}
four = pizza("25 25 20", "8", "4")
E["fp5-lines"] = {"type": "table", "xp": 2, "blanks": {
    f"l{i}": {"accept": [line], "caseSensitive": True, "placeholder": f"line {i}", "width": "16rem"}
    for i, line in enumerate(four, start=1)}}
E["fp5-check"] = {"type": "short", "xp": 2, "rows": 2, "minChars": 8,
    "placeholder": "The calculation that checks the payment…",
    "answer": b64("Check 4 × 25.00 = 100.00. Also check that 80 + 12 + 8 = 100.")}

E["fp6"] = {"type": "short", "xp": 2, "rows": 5, "answer": b64(
    "The algorithm describes the complete method in ordinary words. Pseudocode makes the ordered steps, choices and repetition explicit. "
    "A flowchart shows the paths and the return to the decision. The program carries out the method and produces results to compare with our trace. "
    "All four must preserve equal whole-cent payments with the smallest permitted tip increase, as well as the same delivery and tax rules. "
    "Different wording or drawing arrangements are acceptable if the method and resulting amounts stay the same.")}

data = {
    "id": "lecture-03",
    "course": "COMP 1001: Introduction to Programming",
    "title": "Lecture 3 Workbook",
    "subtitle": "Algorithms, Pseudocode and Programs",
    "exercises": E,
}
out = ROOT / "workbooks/lecture-03/exercises.json"
out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print("wrote", out, len(E), "specs")
