export interface RechartsTooltipPayloadEntry<T = Record<string, unknown>> {
  name: string;
  value: number;
  payload: T;
  color?: string;
  dataKey?: string;
}

export interface RechartsTooltipProps<T = Record<string, unknown>> {
  active?: boolean;
  payload?: RechartsTooltipPayloadEntry<T>[];
  label?: string;
}

export interface RechartsPieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
  index?: number;
  name?: string;
}
