from flask import Flask, request, send_from_directory
from flask_cors import CORS

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
CORS(app)
@app.route('/js/<path:path>')
def send_js(path):
    # return f"hej {path}"
    # return send_from_directory('js', path)
    return send_from_directory("./modelage", path)# as_attachment=True)

if __name__ == "__main__":
    app.run()