# MDS Explorer — Multidimensional Scaling Visualizer

An interactive web tool for visualizing Multidimensional Scaling (MDS) — a machine learning dimensionality reduction technique.

**Course Project · Machine Learning**
**Supervisor:** Dr. A. Swaminathan

---

## 📁 Project Structure

```
mds-explorer/
├── index.html              # Main application (single-file, self-contained)
├── css/
│   └── style.css           # All styles (separated from index.html)
├── js/
│   ├── mds-engine.js       # Core MDS algorithm (Metric + Non-Metric)
│   └── app.js              # Application logic, navigation, rendering
├── data/
│   ├── cities.csv          # European cities distance matrix (sample)
│   ├── word-similarity.csv # Word semantic similarity matrix (sample)
│   └── colors.csv          # Color perceptual distance matrix (sample)
└── README.md
```

---

## 🚀 How to Run

Since this is a pure HTML/CSS/JS project with no build step, just open `index.html` in your browser:

```bash
# Option 1: Direct open
open index.html

# Option 2: Local dev server (recommended to avoid CORS issues)
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

---

## 🔧 Features

| Feature | Description |
|---|---|
| **CSV Upload** | Upload any square distance matrix as a `.csv` file |
| **Metric MDS** | Preserves actual distance magnitudes via gradient descent |
| **Non-Metric MDS** | Preserves only rank ordering using PAV isotonic regression |
| **2D Visualization** | Interactive Plotly scatter with hover, click, pan, zoom |
| **3D Visualization** | Three.js WebGL rendering with drag-to-rotate and scroll-to-zoom |
| **Live Animation** | Watch MDS converge iteration by iteration with animated stress bar |
| **Compare Mode** | Side-by-side Metric vs Non-Metric on the same dataset |
| **Add Points** | Manually add new points to the current visualization |
| **Export** | Download visualization as PNG (2D: 1400×900, 3D: canvas frame) |
| **Galaxy Mode** | Add starfield background to 3D view |

---

## 📐 Algorithm

### Metric MDS
- Gradient descent optimization
- Preserves actual distance magnitudes
- Adaptive learning rate (shrinks when stress increases)

### Non-Metric MDS
- Same gradient descent, but targets are isotonic-regression-fitted distances
- Uses **PAV (Pool Adjacent Violators)** algorithm for monotone regression
- More flexible for ordinal or psychological distance data

### Stress Function (Kruskal's Stress-1)
```
Stress = √[ Σ(d_ij − δ_ij)² / Σ d_ij² ]
```
- `d_ij` = Euclidean distance in current layout
- `δ_ij` = target dissimilarity (from input matrix)
- **< 0.05** = Excellent | **< 0.10** = Good | **< 0.20** = Fair | **> 0.20** = Poor

---

## 📊 CSV Format

Upload a square, symmetric distance matrix with a header row:

```
,City A,City B,City C
City A,0,3.2,5.7
City B,3.2,0,2.1
City C,5.7,2.1,0
```

- First row: comma, then item labels
- First column of each data row: item label
- Diagonal must be `0`
- Matrix must be symmetric: `D[i][j] = D[j][i]`

Sample files are in the `data/` folder.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `R` | Re-run MDS from new random initialization |
| `Esc` | Exit "Add Point" mode |

---

## 🛠 Technology Stack

| Technology | Use |
|---|---|
| HTML5 / CSS3 | Layout, styling, animations |
| Vanilla JavaScript | All application logic, no framework |
| [Plotly.js](https://plotly.com/javascript/) | 2D interactive scatter plots |
| [Three.js r128](https://threejs.org/) | 3D WebGL rendering |
| Google Fonts | Plus Jakarta Sans, Syne, JetBrains Mono |

---

## 📚 References

1. **Bishop, C.M. (2006)** — *Pattern Recognition and Machine Learning*, Chapter 12
2. **Alpaydin, E. (4th ed.)** — *Introduction to Machine Learning*, MIT Press
3. **Kruskal, J.B. (1964)** — "Multidimensional scaling by optimizing goodness of fit to a nonmetric hypothesis", *Psychometrika* 29, 1–27
4. **scikit-learn** — [Manifold Learning Documentation](https://scikit-learn.org/stable/modules/manifold.html#multidimensional-scaling)
5. **AMRITA Virtual Labs** — [ML Virtual Lab](https://www.vlab.amrita.edu/?sub=3&brch=280)

---

## 👥 Team

| Role | Name | Reg No |
|---|---|---|
| Student | A K Soma Sekhar | 24BYB1142 |
| Student | K Gnana Jayadeep | 24BYB1161 |
| Supervisor | Dr. A. Swaminathan | — |
