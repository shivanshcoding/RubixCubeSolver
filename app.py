from flask import Flask, render_template, request, jsonify
import kociemba

app = Flask(__name__)

# Helper: Validate 54 colors (6 each)
def is_valid_cube_string(cube_str):
    if len(cube_str) != 54:
        return False
    return all(cube_str.count(color) == 9 for color in set(cube_str))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/solve", methods=["POST"])
def solve():
    data = request.json
    cube_str = data.get("cube_str", "")

    if not is_valid_cube_string(cube_str):
        return jsonify({"success": False, "error": "Invalid cube input."})

    try:
        solution = kociemba.solve(cube_str)
        return jsonify({"success": True, "solution": solution})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)