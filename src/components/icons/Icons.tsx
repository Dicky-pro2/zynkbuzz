import type { LucideIcon } from 'lucide-react';
import { Icons } from './IconsRegistry';

export { Icons } from './IconsRegistry';
export type IconName = keyof typeof Icons;

interface IconProps extends React.ComponentProps<LucideIcon> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  const Component = Icons[name];
  return <Component {...props} />;
}