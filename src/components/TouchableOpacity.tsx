import React, { useState, useRef, useEffect, type ReactNode, type CSSProperties, useCallback } from "react";

interface HitSlop {
   /** Extra hit area on the top */
   top?: number;
   /** Extra hit area on the bottom */
   bottom?: number;
   /** Extra hit area on the left */
   left?: number;
   /** Extra hit area on the right */
   right?: number;
}

interface TouchableOpacityProps {
   /** The content to be wrapped by the component. */
   children: ReactNode;
   /** Handler to be called when the user taps the component. */
   onPress?: () => void;
   title?: string;
   /** Handler to be called when the user holds the component for a specified duration. */
   onLongPress?: () => void;
   /** Custom styles to be applied to the wrapping div element. */
   style?: CSSProperties;
   /** The opacity of the component when it is active (pressed down). Defaults to 0.2. */
   activeOpacity?: number;
   /** If true, all touch interactions are disabled. Defaults to false. */
   disabled?: boolean;
   /** The delay in milliseconds from the start of a touch before `onPressIn` is called. Defaults to 0. */
   delayPressIn?: number;
   /** The delay in milliseconds from the release of a touch before `onPressOut` is called. Defaults to 100. */
   delayPressOut?: number;
   /** The duration in milliseconds from the start of a touch before `onLongPress` is called. Defaults to 500. */
   delayLongPress?: number;
   /** Optional CSS class name to apply to the component. */
   className?: string;
   /** Maximum distance in pixels a touch can move before canceling the press. Defaults to 10. */
   pressRetentionOffset?: number;
   /** Extends the touchable area beyond the component's bounds */
   hitSlop?: HitSlop | number;
}

const TouchableOpacity: React.FC<TouchableOpacityProps> = ({
   children,
   onPress,
   title,
   onLongPress,
   style = {},
   activeOpacity = 0.2,
   disabled = false,
   delayPressIn = 0,
   delayPressOut = 100,
   delayLongPress = 500,
   className,
   pressRetentionOffset = 10,
   hitSlop,
}) => {
   const [isActive, setIsActive] = useState<boolean>(false);

   const timers = useRef<{
      pressIn: NodeJS.Timeout | null;
      pressOut: NodeJS.Timeout | null;
      longPress: NodeJS.Timeout | null;
   }>({
      pressIn: null,
      pressOut: null,
      longPress: null,
   }).current;

   const isLongPressTriggered = useRef<boolean>(false);
   const touchStartPos = useRef<{ x: number; y: number } | null>(null);
   const elementRef = useRef<HTMLDivElement>(null);

   // Track if we're currently in a touch interaction
   const isTouchActive = useRef<boolean>(false);
   // Track if we're currently inside the touchable area
   const isInsideTouchable = useRef<boolean>(false);



   const clearAllTimers = useCallback(() => {
      if (timers.pressIn) clearTimeout(timers.pressIn);
      if (timers.pressOut) clearTimeout(timers.pressOut);
      if (timers.longPress) clearTimeout(timers.longPress);
      timers.pressIn = null;
      timers.pressOut = null;
      timers.longPress = null;
   }, [timers]);
   useEffect(() => {
      return () => {
         clearAllTimers();
      };
   }, [clearAllTimers]);
   const cancelPress = () => {
      clearAllTimers();
      setIsActive(false);
      isLongPressTriggered.current = false;
      touchStartPos.current = null;
      isTouchActive.current = false;
      isInsideTouchable.current = false;
   };

   const getTouchPosition = (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0] || event.changedTouches[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : null;
   };

   const getMousePosition = (event: React.MouseEvent<HTMLDivElement>) => {
      return { x: event.clientX, y: event.clientY };
   };

   const normalizeHitSlop = (hitSlop: HitSlop | number | undefined): HitSlop => {
      if (typeof hitSlop === "number") {
         return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop };
      }
      return hitSlop || { top: 0, bottom: 0, left: 0, right: 0 };
   };

   const isPositionWithinBounds = (currentPos: { x: number; y: number }) => {
      if (!touchStartPos.current || !elementRef.current) return true;

      const startPos = touchStartPos.current;
      const distance = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));

      return distance <= pressRetentionOffset;
   };

   const isPositionWithinHitSlop = (currentPos: { x: number; y: number }): boolean => {
      if (!elementRef.current) return false;

      const rect = elementRef.current.getBoundingClientRect();
      const hitSlopNormalized = normalizeHitSlop(hitSlop);

      const expandedRect = {
         top: rect.top - (hitSlopNormalized.top ?? 0),
         bottom: rect.bottom + (hitSlopNormalized.bottom ?? 0),
         left: rect.left - (hitSlopNormalized.left ?? 0),
         right: rect.right + (hitSlopNormalized.right ?? 0),
      };

      return (
         currentPos.x >= expandedRect.left &&
         currentPos.x <= expandedRect.right &&
         currentPos.y >= expandedRect.top &&
         currentPos.y <= expandedRect.bottom
      );
   };

   const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (disabled || isTouchActive.current) return;

      const pos = getTouchPosition(event);
      if (pos) {
         touchStartPos.current = pos;
         isTouchActive.current = true;
         isInsideTouchable.current = true;
         startPressSequence();
      }
   };

   const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || !isTouchActive.current) return;

      const currentPos = getTouchPosition(event);
      if (!currentPos) return;

      const withinBounds = isPositionWithinBounds(currentPos);
      const withinHitSlop = isPositionWithinHitSlop(currentPos);

      if (!withinBounds) {
         // Touch moved too far, cancel the press
         cancelPress();
         return;
      }

      const wasInside = isInsideTouchable.current;
      const isNowInside = withinHitSlop;

      if (wasInside && !isNowInside) {
         // Left the touchable area
         isInsideTouchable.current = false;
         clearAllTimers();
         setIsActive(false);
      } else if (!wasInside && isNowInside) {
         // Re-entered the touchable area
         isInsideTouchable.current = true;
         if (!isLongPressTriggered.current) {
            // Re-trigger press animation
            startPressSequence();
         }
      }
   };

   const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (disabled || !isTouchActive.current) return;

      const currentPos = getTouchPosition(event);
      if (currentPos && isPositionWithinBounds(currentPos) && isPositionWithinHitSlop(currentPos)) {
         finishPressSequence();
      } else {
         cancelPress();
      }
   };

   const handleTouchCancel = (event: React.TouchEvent<HTMLDivElement>) => {
      event.stopPropagation();
      cancelPress();
   };

   const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (disabled || isTouchActive.current) return;

      // Prevent default for mouse events to avoid text selection
      event.preventDefault();

      const pos = getMousePosition(event);
      touchStartPos.current = pos;
      isInsideTouchable.current = true;
      startPressSequence();
   };

   const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (disabled || isTouchActive.current) return;

      const currentPos = getMousePosition(event);
      if (isPositionWithinBounds(currentPos) && isPositionWithinHitSlop(currentPos)) {
         finishPressSequence();
      } else {
         cancelPress();
      }
   };

   const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (disabled || isTouchActive.current) return;

      // For mouse, we cancel completely on leave (different from touch behavior)
      cancelPress();
   };

   const startPressSequence = () => {
      clearAllTimers();
      isLongPressTriggered.current = false;

      timers.pressIn = setTimeout(() => {
         setIsActive(true);

         if (onLongPress) {
            timers.longPress = setTimeout(() => {
               isLongPressTriggered.current = true;
               onLongPress();
            }, delayLongPress);
         }
      }, delayPressIn);
   };

   const finishPressSequence = () => {
      clearAllTimers();

      if (isActive && !isLongPressTriggered.current && onPress) {
         onPress();
      }

      timers.pressOut = setTimeout(() => {
         setIsActive(false);
         touchStartPos.current = null;
         isTouchActive.current = false;
         isInsideTouchable.current = false;
      }, delayPressOut);
   };

   // Handle keyboard interactions for accessibility
   const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (event.key === "Enter" || event.key === " ") {
         event.preventDefault();
         event.stopPropagation();

         if (onPress) {
            setIsActive(true);
            onPress();

            // Brief visual feedback for keyboard activation
            setTimeout(() => {
               setIsActive(false);
            }, 150);
         }
      }
   };

   const hitSlopNormalized = normalizeHitSlop(hitSlop);
   const hasHitSlop = hitSlopNormalized.top ?? hitSlopNormalized.bottom ?? hitSlopNormalized.left ?? hitSlopNormalized.right;

   const componentStyle: CSSProperties = {
      ...style,
      transition: "opacity 150ms ease-in-out",
      opacity: isActive ? activeOpacity : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
      // Improve touch behavior on mobile
      touchAction: "manipulation",
      WebkitTouchCallout: "none",
      WebkitUserSelect: "none",
      MozUserSelect: "none",
      msUserSelect: "none",
      // Add negative margin to expand hit area if hitSlop is provided
      ...(hasHitSlop && {
         margin: `${-(hitSlopNormalized.top ?? 0)}px ${-(hitSlopNormalized.right ?? 0)}px ${-(hitSlopNormalized.bottom ?? 0)}px ${-(
            hitSlopNormalized.left ?? 0
         )}px`,
         padding: `${hitSlopNormalized.top ?? 0}px ${hitSlopNormalized.right ?? 0}px ${hitSlopNormalized.bottom ?? 0}px ${
            hitSlopNormalized.left ?? 0
         }px`,
      }),
   };

   return (
      <div
         ref={elementRef}
         style={componentStyle}
         className={className}
         title={title}
         onMouseDown={handleMouseDown}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseLeave}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onTouchCancel={handleTouchCancel}
         onKeyDown={handleKeyDown}
         role="button"
         tabIndex={disabled ? -1 : 0}
         aria-disabled={disabled}
      >
         {children}
      </div>
   );
};

export default TouchableOpacity;
