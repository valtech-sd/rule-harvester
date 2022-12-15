export { ScheduleConfig as ICoreSchedulerConfig } from '../inputs/helpers/task-scheduler';

export interface ICoreSchedulerInput {
  name: string;
  intervalText?: string;
  intervalCron?: string;
  input?: any;
  queue: {
    waiting: number;
    pending: number;
  };
}
