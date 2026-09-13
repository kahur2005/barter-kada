import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

type BackLinkProps = Omit<LinkProps, 'children'> & { children?: ReactNode };

export function BackLink({ children = 'Kembali', className = '', ...props }: BackLinkProps) {
  return <Link {...props} className={`back-link ${className}`.trim()}><Icon name="back" /><span>{children}</span></Link>;
}

type BackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  children?: ReactNode;
  fallback?: string;
};

export function BackButton({ children = 'Kembali', fallback = '/', className = '', ...props }: BackButtonProps) {
  const navigate = useNavigate();
  return <button {...props} className={`back-link text-button ${className}`.trim()} type="button" onClick={() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  }}><Icon name="back" /><span>{children}</span></button>;
}

type ActionLinkProps = Omit<LinkProps, 'children'> & { children: ReactNode };

export function ActionLink({ children, className = '', ...props }: ActionLinkProps) {
  return <Link {...props} className={`inline-link ${className}`.trim()}><span>{children}</span><Icon name="arrow" /></Link>;
}
