import logoImage from './smart-crosswalk-logo.png';

/**
 * Logo — Smart Crosswalk product mark.
 * Height is derived from `size`; width is proportionally wider.
 *
 * @param {object} props
 * @param {number} [props.size=40] - Base height in pixels (width is 1.3× height)
 *
 * @example
 * <Logo size={40} />
 */
const Logo = ({ size = 40 }) => {
  return (
    <img
      src={logoImage}
      alt="Smart Pedestrian Crossing"
      style={{
        width: size * 1.3,
        height: size,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
};

export default Logo;
