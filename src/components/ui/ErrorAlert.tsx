interface ErrorAlertProps {
  title?: string;
  message: string;
}

export default function ErrorAlert({ title = 'Error', message }: ErrorAlertProps) {
  return (
    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
      <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{title}</h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}
