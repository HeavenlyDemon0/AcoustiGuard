# AcoustiGuard Curated Test Input Benchmark Results

> Representative test set selected for live demonstration. Scores and decisions verified directly through backend REST API (`/predict`).

| Machine ID | Target AUC | Target Combined Acc | Achieved Sample Acc | Total Files | Normal / Abnormal Split |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **fan_00** | 0.887 | 89% | **90.0% (18/20)** | 20 | 10 normal / 10 abnormal |
| **fan_02** | 0.978 | 98% | **100.0% (20/20)** | 20 | 10 normal / 10 abnormal |
| **valve_00** | 0.805 | 81% | **80.0% (16/20)** | 20 | 10 normal / 10 abnormal |
| **valve_02** | 0.807 | 81% | **80.0% (16/20)** | 20 | 10 normal / 10 abnormal |

---

### Machine ID: `fan_00`
**Final Accuracy**: `18/20 correct = 90%` (Target: `89%` AUC-based accuracy)

| Filename | True Label | P95 Score | Calibrated Threshold (τ) | Decision | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `00000000.wav` | `NORMAL` | `0.049686` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000001.wav` | `NORMAL` | `0.052047` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000002.wav` | `NORMAL` | `0.049465` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000003.wav` | `NORMAL` | `0.049753` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000004.wav` | `NORMAL` | `0.052601` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000005.wav` | `NORMAL` | `0.048687` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000006.wav` | `NORMAL` | `0.050994` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000007.wav` | `NORMAL` | `0.052227` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000008.wav` | `NORMAL` | `0.049994` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000010.wav` | `NORMAL` | `0.052402` | `0.054740` | `NORMAL` | ✅ CORRECT |
| `00000000.wav` | `ANOMALY` | `0.061167` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000001.wav` | `ANOMALY` | `0.067263` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000002.wav` | `ANOMALY` | `0.064291` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000003.wav` | `ANOMALY` | `0.062987` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000004.wav` | `ANOMALY` | `0.059539` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000005.wav` | `ANOMALY` | `0.057896` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000006.wav` | `ANOMALY` | `0.055328` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000007.wav` | `ANOMALY` | `0.055766` | `0.054740` | `ANOMALY` | ✅ CORRECT |
| `00000047.wav` | `ANOMALY` | `0.052566` | `0.054740` | `NORMAL` | ❌ WRONG |
| `00000070.wav` | `ANOMALY` | `0.052975` | `0.054740` | `NORMAL` | ❌ WRONG |

### Machine ID: `fan_02`
**Final Accuracy**: `20/20 correct = 100%` (Target: `98%` AUC-based accuracy)

| Filename | True Label | P95 Score | Calibrated Threshold (τ) | Decision | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `00000000.wav` | `NORMAL` | `0.090054` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000001.wav` | `NORMAL` | `0.092609` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000002.wav` | `NORMAL` | `0.091716` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000003.wav` | `NORMAL` | `0.090437` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000004.wav` | `NORMAL` | `0.089896` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000005.wav` | `NORMAL` | `0.090045` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000006.wav` | `NORMAL` | `0.086991` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000007.wav` | `NORMAL` | `0.089310` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000008.wav` | `NORMAL` | `0.090182` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000009.wav` | `NORMAL` | `0.090970` | `0.096651` | `NORMAL` | ✅ CORRECT |
| `00000000.wav` | `ANOMALY` | `0.137692` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000001.wav` | `ANOMALY` | `0.141937` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000002.wav` | `ANOMALY` | `0.141791` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000003.wav` | `ANOMALY` | `0.150910` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000004.wav` | `ANOMALY` | `0.138142` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000005.wav` | `ANOMALY` | `0.133550` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000006.wav` | `ANOMALY` | `0.142129` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000007.wav` | `ANOMALY` | `0.141679` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000008.wav` | `ANOMALY` | `0.142903` | `0.096651` | `ANOMALY` | ✅ CORRECT |
| `00000009.wav` | `ANOMALY` | `0.141941` | `0.096651` | `ANOMALY` | ✅ CORRECT |

### Machine ID: `valve_00`
**Final Accuracy**: `16/20 correct = 80%` (Target: `81%` AUC-based accuracy)

| Filename | True Label | P95 Score | Calibrated Threshold (τ) | Decision | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `00000001.wav` | `NORMAL` | `0.248188` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000002.wav` | `NORMAL` | `0.290353` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000003.wav` | `NORMAL` | `0.338953` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000005.wav` | `NORMAL` | `0.323587` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000008.wav` | `NORMAL` | `0.229635` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000010.wav` | `NORMAL` | `0.274889` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000011.wav` | `NORMAL` | `0.326145` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000012.wav` | `NORMAL` | `0.206447` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000013.wav` | `NORMAL` | `0.285576` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000015.wav` | `NORMAL` | `0.343326` | `0.344347` | `NORMAL` | ✅ CORRECT |
| `00000000.wav` | `ANOMALY` | `0.060855` | `0.344347` | `NORMAL` | ❌ WRONG |
| `00000001.wav` | `ANOMALY` | `0.148373` | `0.344347` | `NORMAL` | ❌ WRONG |
| `00000002.wav` | `ANOMALY` | `0.108061` | `0.344347` | `NORMAL` | ❌ WRONG |
| `00000003.wav` | `ANOMALY` | `0.057053` | `0.344347` | `NORMAL` | ❌ WRONG |
| `00000005.wav` | `ANOMALY` | `0.350042` | `0.344347` | `ANOMALY` | ✅ CORRECT |
| `00000011.wav` | `ANOMALY` | `0.408311` | `0.344347` | `ANOMALY` | ✅ CORRECT |
| `00000013.wav` | `ANOMALY` | `0.432286` | `0.344347` | `ANOMALY` | ✅ CORRECT |
| `00000014.wav` | `ANOMALY` | `0.416085` | `0.344347` | `ANOMALY` | ✅ CORRECT |
| `00000020.wav` | `ANOMALY` | `0.425930` | `0.344347` | `ANOMALY` | ✅ CORRECT |
| `00000037.wav` | `ANOMALY` | `0.446035` | `0.344347` | `ANOMALY` | ✅ CORRECT |

### Machine ID: `valve_02`
**Final Accuracy**: `16/20 correct = 80%` (Target: `81%` AUC-based accuracy)

| Filename | True Label | P95 Score | Calibrated Threshold (τ) | Decision | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `00000000.wav` | `NORMAL` | `0.088914` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000001.wav` | `NORMAL` | `0.059407` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000002.wav` | `NORMAL` | `0.084663` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000003.wav` | `NORMAL` | `0.108436` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000004.wav` | `NORMAL` | `0.088158` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000005.wav` | `NORMAL` | `0.071360` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000006.wav` | `NORMAL` | `0.069463` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000007.wav` | `NORMAL` | `0.144439` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000008.wav` | `NORMAL` | `0.117449` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000009.wav` | `NORMAL` | `0.075837` | `0.385139` | `NORMAL` | ✅ CORRECT |
| `00000000.wav` | `ANOMALY` | `0.092181` | `0.385139` | `NORMAL` | ❌ WRONG |
| `00000001.wav` | `ANOMALY` | `0.114936` | `0.385139` | `NORMAL` | ❌ WRONG |
| `00000002.wav` | `ANOMALY` | `0.115965` | `0.385139` | `NORMAL` | ❌ WRONG |
| `00000003.wav` | `ANOMALY` | `0.194764` | `0.385139` | `NORMAL` | ❌ WRONG |
| `00000060.wav` | `ANOMALY` | `0.482590` | `0.385139` | `ANOMALY` | ✅ CORRECT |
| `00000062.wav` | `ANOMALY` | `0.423651` | `0.385139` | `ANOMALY` | ✅ CORRECT |
| `00000063.wav` | `ANOMALY` | `0.431848` | `0.385139` | `ANOMALY` | ✅ CORRECT |
| `00000071.wav` | `ANOMALY` | `0.526317` | `0.385139` | `ANOMALY` | ✅ CORRECT |
| `00000072.wav` | `ANOMALY` | `0.484018` | `0.385139` | `ANOMALY` | ✅ CORRECT |
| `00000079.wav` | `ANOMALY` | `0.483400` | `0.385139` | `ANOMALY` | ✅ CORRECT |
