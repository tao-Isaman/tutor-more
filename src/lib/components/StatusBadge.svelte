<script lang="ts">
	let { status }: { status: string } = $props();
	const styles: Record<string, string> = {
		approved: 'bg-emerald-50 text-emerald-700',
		pending: 'bg-sun-100 text-sun-600',
		rejected: 'bg-neutral-100 text-neutral-500',
		admin: 'bg-ink text-white',
		tutor: 'bg-brand-600 text-white',
		student: 'bg-neutral-100 text-neutral-700',
		open: 'bg-emerald-50 text-emerald-700',
		closed: 'bg-neutral-100 text-neutral-500',
		draft: 'bg-neutral-100 text-neutral-500',
		published: 'bg-emerald-50 text-emerald-700'
	};
	const labels: Record<string, string> = {
		approved: 'อนุมัติแล้ว',
		pending: 'รออนุมัติ',
		rejected: 'ไม่อนุมัติ',
		admin: 'แอดมิน',
		tutor: 'ติวเตอร์',
		student: 'นักเรียน',
		open: 'เปิดอยู่',
		closed: 'ปิดแล้ว',
		draft: 'ฉบับร่าง',
		published: 'เผยแพร่แล้ว'
	};
</script>

<span class="badge {styles[status] ?? 'bg-neutral-100 text-neutral-600'}">
	{labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
</span>
