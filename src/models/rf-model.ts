export interface RFModel {
  type: 'regression' | 'classification';
  n_features: number;
  n_estimators: number;
  n_classes?: number;
  features?: string[];
  scaler: {
    mean: number[];
    scale: number[];
  };
  trees: {
    n_nodes: number;
    value_width: number;
    left: number[];
    right: number[];
    feature: number[];
    threshold: number[];
    value: number[];
    offsets: number[];
  };
}