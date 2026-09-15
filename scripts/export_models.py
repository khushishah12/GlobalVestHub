#!/usr/bin/env python3
"""Export trained sklearn models to compact JSON for in-app (TypeScript) inference.

Emits src/models/stock_return_rf.json and src/models/regime_rf.json.
These mirror RandomForestRegressor/RandomForestClassifier + StandardScaler exactly
so no Python runtime is needed at deploy time (Vercel serverless).
"""
import json
import os

import joblib
import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(BASE, "..", "src", "models")


def tree_arrays(tree):
    t = tree.tree_
    return {
        "left": [int(x) for x in t.children_left.tolist()],
        "right": [int(x) for x in t.children_right.tolist()],
        "feature": [int(x) for x in t.feature.tolist()],
        "threshold": [float(x) for x in t.threshold.tolist()],
        "value": [float(x) for x in t.value.tolist()],
    }


def pack_trees(forest, value_width):
    left, right, feature, threshold, value = [], [], [], [], []
    offsets = []
    off = 0
    for est in forest.estimators_:
        t = est.tree_
        nodes = t.node_count
        v = t.value.reshape(nodes, -1)
        left.extend(int(x) for x in t.children_left.tolist())
        right.extend(int(x) for x in t.children_right.tolist())
        feature.extend(int(x) for x in t.feature.tolist())
        threshold.extend(float(x) for x in t.threshold.tolist())
        for node in range(nodes):
            for k in range(value_width):
                value.append(float(v[node, k]))
        offsets.append(off)
        off += nodes
    offsets.append(off)
    return {
        "n_nodes": off,
        "value_width": value_width,
        "left": left,
        "right": right,
        "feature": feature,
        "threshold": threshold,
        "value": value,
        "offsets": offsets,
    }


def scaler_json(scaler):
    return {"mean": [float(x) for x in scaler.mean_.tolist()], "scale": [float(x) for x in scaler.scale_.tolist()]}


def main():
    # Regression model (stock picker + future returns)
    reg = joblib.load(os.path.join(MODELS, "stock_return_regressor.pkl"))
    scaler = joblib.load(os.path.join(MODELS, "regression_scaler.pkl"))
    features = joblib.load(os.path.join(MODELS, "stock_regression_features.pkl"))
    reg_out = {
        "type": "regression",
        "n_features": int(reg.n_features_in_),
        "n_estimators": len(reg.estimators_),
        "features": list(features),
        "scaler": scaler_json(scaler),
        "trees": pack_trees(reg, 1),
    }
    reg_path = os.path.join(MODELS, "stock_return_rf.json")
    with open(reg_path, "w") as f:
        json.dump(reg_out, f, separators=(",", ":"))
    print(f"wrote {reg_path} ({os.path.getsize(reg_path)//1024} KB)")

    # Regime classifier
    clf = joblib.load(os.path.join(MODELS, "regime_rf_model.pkl"))
    cscaler = joblib.load(os.path.join(MODELS, "regime_scaler.pkl"))
    n_classes = int(clf.n_classes_[0]) if hasattr(clf.n_classes_, "__len__") else int(clf.n_classes_)
    clf_out = {
        "type": "classification",
        "n_features": int(clf.n_features_in_),
        "n_estimators": len(clf.estimators_),
        "n_classes": n_classes,
        "scaler": scaler_json(cscaler),
        "trees": pack_trees(clf, n_classes),
    }
    clf_path = os.path.join(MODELS, "regime_rf.json")
    with open(clf_path, "w") as f:
        json.dump(clf_out, f, separators=(",", ":"))
    print(f"wrote {clf_path} ({os.path.getsize(clf_path)//1024} KB)")


if __name__ == "__main__":
    main()