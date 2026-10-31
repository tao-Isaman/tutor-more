export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
}

let nextId = 1;
export const toasts = $state<Toast[]>([]);

export function toast(message: string, kind: ToastKind = 'success', ms = 3500) {
	const id = nextId++;
	toasts.push({ id, kind, message });
	setTimeout(() => dismiss(id), ms);
}
toast.error = (message: string) => toast(message, 'error', 5000);
toast.info = (message: string) => toast(message, 'info');

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}
