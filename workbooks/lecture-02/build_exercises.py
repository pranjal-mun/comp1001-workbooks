"""Build workbooks/lecture-02/exercises.json.

Lecture 2 has no Python: every widget is a short answer or a fill-in table.
The pizza-payment and book-packing figures used in the answer keys are still
computed here (with Decimal, half-cent rounded up, exactly as the lecture
states the rules) rather than typed by hand. Run from anywhere:

    python3 workbooks/lecture-02/build_exercises.py
    python3 tools/check_workbook.py workbooks/lecture-02
"""
import base64, json, pathlib
from decimal import Decimal, ROUND_HALF_UP

ROOT = pathlib.Path(__file__).resolve().parents[2]

def b64(text):
    return base64.b64encode(text.rstrip("\n").encode()).decode()

def cents(amount):
    return int((Decimal(amount) * 100).to_integral_value(ROUND_HALF_UP))

def payment(food, tip, people, delivery="10", tax_rate="0.15"):
    """The lecture's agreed rules, including the smallest tip increase.
    Returns (tax, original bill, final tip, revised bill, payment) in cents."""
    assert people >= 1
    taxable = Decimal(food) + Decimal(delivery)
    tax = cents((taxable * Decimal(tax_rate)).quantize(Decimal("0.01"), ROUND_HALF_UP))
    original = cents(taxable) + tax + cents(tip)
    total, final_tip = original, cents(tip)
    while total % people:
        total += 1
        final_tip += 1
    return tax, original, final_tip, total, total // people

def dollars(c):
    return f"{c // 100}.{c % 100:02d}"

def pack(books, capacity=6):
    boxes = []
    while books > 0:
        boxes.append(min(capacity, books))
        books -= boxes[-1]
    return boxes

# Worked examples from the lecture body, checked against the printed values.
assert payment("70", "8", 4) == (1200, 10000, 800, 10000, 2500)
assert payment("70", "8", 3) == (1200, 10000, 802, 10002, 3334)
assert payment("70", "8", 1) == (1200, 10000, 800, 10000, 10000)
assert payment("19.99", "0", 1) == (450, 3449, 0, 3449, 3449)
assert payment("19.90", "0", 1)[0] == 449

def short(answer, xp=5, min_chars=60, rows=6, **kw):
    return {"type": "short", "xp": xp, "minChars": min_chars, "rows": rows, "answer": b64(answer), **kw}

def money_blank(c, **kw):
    d = dollars(c)
    forms = [d] + ([d[:-3]] if d.endswith(".00") else [])   # 9.00 may also be written 9
    accept = [f"{prefix}{f}" for f in forms for prefix in ("", "CA$", "CA$ ", "$", "$ ")]
    return {"accept": accept, "placeholder": "CA$", "width": "7rem", "show": d, **kw}

E = {}

# ---------------------------------------------------------------- Practice 1
E["p1-questions"] = short(
    "Possible questions are: Have you agreed to equal payments? What delivery fee applies? "
    "What amount is taxed, and at what rate? What tip amount or tip rule have you agreed on? "
    "Other relevant questions include whether there are discounts, how tax is rounded, "
    "and what to do if equal payments leave a fraction of a cent.\n\n"
    "The new group or store may use different rules. For example, tax might apply to a "
    "different amount, or the friends might not agree to increasing the tip. Our method "
    "can provide familiar smaller jobs, but its assumptions must be checked first.",
    min_chars=120, rows=7)

# ---------------------------------------------------------------- Practice 2
E["p2a-method"] = short(
    "Add food and delivery. Calculate 15% tax on that amount and round to the nearest "
    "cent, with an exact half-cent rounded upward. Add the rounded tax and agreed tip. "
    "Convert the total to cents. If it does not divide into whole cents per person, "
    "increase the tip and total one cent at a time. Stop at the first total that does. "
    "Divide and report the final tip, revised bill, and payment per person.",
    min_chars=80)

four = payment("50", "6", 4)
seven = payment("50", "6", 7)
assert four == (900, 7500, 600, 7500, 1875)
assert seven == (900, 7500, 604, 7504, 1072)
E["p2b-table"] = {"type": "table", "xp": 1, "blanks": {
    "tax4": money_blank(four[0]), "orig4": money_blank(four[1]), "tip4": money_blank(four[2]),
    "bill4": money_blank(four[3]), "pay4": money_blank(four[4]),
    "tax7": money_blank(seven[0]), "orig7": money_blank(seven[1]), "tip7": money_blank(seven[2]),
    "bill7": money_blank(seven[3]), "pay7": money_blank(seven[4]),
}}
E["p2c-verify"] = short(
    f"For 4 people, 7500 cents divides exactly: {four[4]} cents each, so the tip stays CA$6.00, "
    f"the bill stays CA$75.00, and each person pays CA${dollars(four[4])}. Check: 4 × {dollars(four[4])} = {dollars(four[3])}.\n\n"
    "For 7 people, 7500 cents leaves 3 cents after giving each person a 1071-cent share. "
    "Totals 7501, 7502, and 7503 still do not divide into whole cents per person. "
    f"The next total, {seven[3]} cents, gives {seven[3]} ÷ 7 = {seven[4]} cents each. "
    f"The smallest increase is CA$0.04. The final tip is CA${dollars(seven[2])}, the revised bill is "
    f"CA${dollars(seven[3])}, and each person pays CA${dollars(seven[4])}. Check: 7 × {dollars(seven[4])} = {dollars(seven[3])}.",
    xp=3, min_chars=40, rows=4)

# ---------------------------------------------------------------- Practice 3
black = {"accept": ["black", "b", "B"], "placeholder": "colour", "width": "5.5rem", "show": "black"}
white = {"accept": ["white", "w", "W"], "placeholder": "colour", "width": "5.5rem", "show": "white"}
E["p3a-count"] = {"type": "table", "xp": 1, "blanks": {
    "per-row": {"accept": ["3", "3 tiles", "three"], "width": "6rem", "show": "3"},
    "rows": {"accept": ["2", "2 rows", "two"], "width": "6rem", "show": "2"},
    "total": {"accept": ["6", "6 tiles", "six"], "width": "6rem", "show": "6"},
}}
E["p3a-floor"] = {"type": "table", "xp": 1, "blanks": {
    "t1": dict(black), "t2": dict(white), "t3": dict(black),
    "t4": dict(white), "t5": dict(black), "t6": dict(white),
}}
E["p3b-rule"] = short(
    "With three tiles per row, the first row ends with black. Switching colour for "
    "the next placement starts row 2 with white, which is correct here.\n\n"
    "With four tiles per row, the first row ends with white. Switching again would "
    "start row 2 with black, directly below a black tile, which is wrong.\n\n"
    "The corrected rule is to start a new row with the opposite colour to the first "
    "tile in the row above, then alternate across the row.",
    min_chars=80)
E["p3c-check"] = short(
    "Check that the required number of rows and positions are filled without gaps "
    "or overlaps. Check every pair of tiles sharing a horizontal or vertical side. "
    "Every such pair must have opposite colours. A correct tile count alone is not enough.",
    xp=3, min_chars=40, rows=4)

# ---------------------------------------------------------------- Practice 4
assert pack(23) == [6, 6, 6, 5] and pack(24) == [6, 6, 6, 6] and pack(0) == []
E["p4a-method"] = short(
    "Begin with no boxes used. While books remain, take an empty box and put 6 books "
    "into it if at least 6 remain; otherwise put all the remaining books into it. Record "
    "that box's book count. Continue until no books remain, then report the number of "
    "boxes and their counts.\n\n"
    "If there are no books at the start, report zero boxes.",
    min_chars=80)

def counts_blank(boxes):
    if not boxes:
        return {"accept": ["none", "no boxes", "nothing", "0", "-", "—", "n/a"], "placeholder": "books per box", "width": "9rem", "show": "none"}
    joined = ", ".join(map(str, boxes))
    return {"accept": [joined, joined.replace(", ", ","), joined.replace(", ", " "), joined.replace(", ", " + "), joined.replace(", ", "+"), joined.replace(", ", "/"), joined.replace(", ", " / ")],
            "placeholder": "books per box", "width": "9rem", "show": joined}

E["p4b-table"] = {"type": "table", "xp": 1, "blanks": {
    "boxes23": {"accept": [str(len(pack(23))), "four"], "width": "5rem", "show": "4"}, "counts23": counts_blank(pack(23)),
    "boxes24": {"accept": [str(len(pack(24))), "four"], "width": "5rem", "show": "4"}, "counts24": counts_blank(pack(24)),
    "boxes0": {"accept": [str(len(pack(0))), "zero", "none"], "width": "5rem", "show": "0"}, "counts0": counts_blank(pack(0)),
}}
E["p4c-why"] = short(
    "Three boxes hold at most 3 × 6 = 18 books, leaving 5 unpacked. Both 23 and 24 books "
    "need at least four boxes, and the described arrangements use exactly four. An "
    "equal-share calculation alone does not solve this task: box capacity matters, and "
    "the last box can be partly full.",
    xp=3, min_chars=40, rows=4)

# ---------------------------------------------------------------- Practice 5
E["p5-reflect"] = short(
    "For pizza, the initial method added charges and divided equally. A CA$100 bill "
    "shared by 3 people required fractions of a cent. The group agreed to a minimal "
    "tip increase, so the revised method produces equal payments that cover the revised bill.\n\n"
    "For tiles, starting every row with black made each row alternate but put matching "
    "colours above and below one another. The revision chooses each new row's first "
    "colour from the first tile in the row above.\n\n"
    "One lesson is to check the whole result against all requirements. For packing, "
    "check that all books are packed and that no box holds more than 6. Also check "
    "whether fewer boxes could hold all the books. Another useful lesson is to test a "
    "boundary case: zero books should give zero boxes, not one empty box.",
    min_chars=120, rows=8)

spec = {
    "id": "lecture-02",
    "course": "COMP 1001: Introduction to Programming",
    "title": "Lecture 2 Workbook",
    "subtitle": "Problem Solving",
    "exercises": E,
}
out = pathlib.Path(__file__).with_name("exercises.json")
out.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {out.relative_to(ROOT)} with {len(E)} exercises")
