import { ActionCommandBase } from '../../test-run/commands/base';
import EventEmitter from '../core/utils/event-emitter';
import { AxisValuesData } from '../core/utils/values/axis-values';
import { DispatchEventFn } from '../../native-automation/client/types';

export interface AutomationHandler {
    create: (cmd: ActionCommandBase, elements: any[], dispatchNativeAutomationEventFn?: DispatchEventFn) => Automation;
    ensureElsProps?: (elements: any[]) => void;
    ensureCmdArgs?: (cmd: ActionCommandBase) => void;
    additionalSelectorProps?: string[];
}

export interface Automation extends EventEmitter {
    run(strictElementCheck: boolean): Promise<any>;
    TARGET_ELEMENT_FOUND_EVENT?: string;
    WARNING_EVENT?: string;
}

export interface CursorUI {
    isVisible?(): boolean;
    move(position: AxisValuesData<number>): Promise<void>;
    hide?(): Promise<void>;
    show?(): Promise<void>;
    leftButtonDown(): Promise<void>;
    rightButtonDown(): Promise<void>;
    buttonUp(): Promise<void>;
    shouldRender: boolean;
}
