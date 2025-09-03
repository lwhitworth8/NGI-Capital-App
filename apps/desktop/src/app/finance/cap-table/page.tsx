import { redirect } from 'next/navigation';

export default function FinanceCapTableRedirect() {
  // Legacy route: cap table now lives within /finance dashboard
  redirect('/finance');
}
