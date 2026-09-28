import { hueFor, initial } from "../format";

export default function Avatar({ name, size = 32 }) {
  const hue = hueFor(name);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue} 45% 92%)`,
        color: `hsl(${hue} 55% 26%)`,
      }}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}
