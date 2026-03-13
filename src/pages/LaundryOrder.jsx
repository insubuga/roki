import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function LaundryOrder() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('ActiveCycle'), { replace: true });
  }, [navigate]);
  return null;
}