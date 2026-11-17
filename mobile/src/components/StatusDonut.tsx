import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Segment {
  value: number;
  color: string;
}

const SIZE = 168;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export const StatusDonut = ({
  segments,
  total,
  label,
}: {
  segments: Segment[];
  total: number;
  label: string;
}) => {
  let offset = 0;
  return (
    <View
      className="items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg height={SIZE} width={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={R}
          stroke="#2d303e"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          segments.map((s) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * C;
            const node = (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                fill="none"
                key={s.color}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
                r={R}
                rotation={-90}
                stroke={s.color}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                strokeWidth={STROKE}
              />
            );
            offset += len;
            return node;
          })}
      </Svg>
      <View className="absolute items-center">
        <Text className="font-semibold text-3xl text-white">{total}</Text>
        <Text className="text-secondary-400 text-xs uppercase">{label}</Text>
      </View>
    </View>
  );
};
