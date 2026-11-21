import React from "react";
import { shortTime } from "@lib/dates";
import { cx } from "@lib/format";
import { shiftColorClasses } from "@components/ui/Badge";
import { Shift } from "@types";

/** A shift as a small coloured block: type name and times. */
const ShiftChip = ({
  shift,
  showName = false,
  className,
  children,
}: {
  shift: Pick<Shift, "shiftTypeName" | "startTime" | "endTime" | "color" | "userName">;
  showName?: boolean;
  className?: string;
  children?: React.ReactNode;
}) => {
  const palette = shiftColorClasses[shift.color] ?? shiftColorClasses.slate;
  return (
    <span className={cx("flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs ring-1 ring-inset", palette.soft, className)}>
      <span className={cx("h-2 w-2 shrink-0 rounded-full", palette.dot)} aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{showName ? shift.userName : shift.shiftTypeName}</span>{" "}
        <span className="tabular-nums opacity-80">
          {shortTime(shift.startTime)}–{shortTime(shift.endTime)}
        </span>
      </span>
      {children}
    </span>
  );
};

export default ShiftChip;
