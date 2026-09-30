import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordField: React.FC<PasswordFieldProps> = ({ className = '', ...props }) => {
  const [visible, setVisible] = useState(false);
  return <div className="password-field"><input {...props} type={visible ? 'text' : 'password'} className={className} /><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>;
};
