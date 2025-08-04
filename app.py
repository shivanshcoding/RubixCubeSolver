from flask import Flask, render_template, request, jsonify

# Try to import kociemba, but continue if it's not available
try:
    import kociemba
    KOCIEMBA_AVAILABLE = True
except ImportError:
    KOCIEMBA_AVAILABLE = False
    print("Warning: kociemba module not available. Cube solving functionality will be limited.")

app = Flask(__name__)

# Helper: Validate 54 colors (6 each)
def is_valid_cube_string(cube_str):
    if len(cube_str) != 54:
        return False
    return all(cube_str.count(color) == 9 for color in set(cube_str))

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/manual")
def m_input():
    return render_template("manualinput.html")

@app.route("/solve", methods=["POST"])
def solve():
    # Handle both JSON (from manual input) and form data (from online cube)
    if request.is_json:
        data = request.json
        cube_str = data.get("cube_str", "")
        source = "manual_input"
    else:
        cube_str = request.form.get("cube_string", "")
        source = request.form.get("source", "manual_input")
    
    # For online cube transfers, redirect to solution page with cube state
    if source == "online_cube":
        try:
            # Convert cube state if needed and validate
            if cube_str and len(cube_str) >= 54:
                # Extract first 54 characters if longer
                cube_str = cube_str[:54]
                
                # Try to solve the cube if kociemba is available
                if KOCIEMBA_AVAILABLE:
                    solution = kociemba.solve(cube_str)
                else:
                    solution = "Solving functionality unavailable (kociemba module not installed)"
                
                # Redirect to solution page with the solution
                from flask import redirect, url_for
                return redirect(url_for('solution', 
                                      cube_state=cube_str, 
                                      solution=solution,
                                      source='online_cube'))
            else:
                # Redirect back with error
                return redirect(url_for('online_scrambles') + '?error=invalid_cube')
        except Exception as e:
            # Redirect back with error
            return redirect(url_for('online_scrambles') + f'?error={str(e)}')
    
    # Handle JSON requests (original manual input functionality)
    if not is_valid_cube_string(cube_str):
        return jsonify({"success": False, "error": "Invalid cube input."})

    try:
        if KOCIEMBA_AVAILABLE:
            solution = kociemba.solve(cube_str)
            return jsonify({"success": True, "solution": solution})
        else:
            return jsonify({"success": False, "error": "Solving functionality unavailable (kociemba module not installed)"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/solution')
def solution():
    return render_template('solution.html')

@app.route('/ai')
def ai_input():
    return render_template('ai_input.html')

@app.route('/online')
def online_scrambles():
    return render_template('onlinecubesolving.html')

if __name__ == "__main__":
    app.run(debug=True)