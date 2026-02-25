import { cn } from '@/lib/utils';
import { CustomHandleProps } from '@/types/filetypes';
import { Handle } from '@xyflow/react'
import React from 'react'


const CustomHandle: React.FC<CustomHandleProps> = ({ id, active, text, type, position, style, color }) => {
  return (
    <Handle
      type={type}
      position={position}
      id={`handle-${id}`}
      style={{ height: '12px', width: '12px', ...style }}
    >
      <span
        className={cn(
          "absolute bottom-0 -translate-y-1/2",
          "whitespace-nowrap text-[10px] font-medium text-edge-circle",
          "transition-all duration-200 pointer-events-none",
          type === "source" ? "left-2" : "right-1.5",
          active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
        )}
      >
        {text}
      </span>
    </Handle>
  )
}



export default CustomHandle