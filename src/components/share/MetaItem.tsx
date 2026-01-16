import { cn } from "@/lib/utils";

/**
 * Metadata Item Component
 * Displays a labeled value with an icon
 */
export const MetaItem = ({
    icon: Icon,
    label,
    value,
    className
}: {
    icon: React.ElementType;
    label: string;
    value: string | React.ReactNode;
    className?: string;
}) => (
    <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-1.5 text-slate-500">
            <Icon className="w-3 h-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-xs font-medium text-slate-200 pl-[18px]">{value}</p>
    </div>
);
