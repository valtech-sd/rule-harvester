// Bring in package dependencies
import _ from 'lodash';
import TaskScheduler, { Task, ScheduleConfig } from './helpers/task-scheduler';

// Bring in rule-harvester dependencies
import { IInputProvider, ILogger } from '../../types';
import { ICoreSchedulerInput } from '../types/scheduler-types';

// Export an interface to hold our provider options
export interface ICoreInputSchedulerProviderOptions {
  inputContextCallback?: (req: ICoreSchedulerInput) => void;
}

export default class CoreInputSchedulerProvider implements IInputProvider {
  private alreadyRegistered: boolean;
  private logger?: ILogger;
  private scheduler: TaskScheduler;
  private applyInputCb!: (input: any, context: any) => Promise<any>;
  private options: ICoreInputSchedulerProviderOptions;

  /**
   * constructor
   *
   * This function sets class level variables.
   *
   * @param schedulerConfig - Schedule configuration for the task scheduler
   * @param logger - a logger instance to use for logging.
   * @param options
   **/
  constructor(
    schedulerConfig: ScheduleConfig,
    logger: ILogger | undefined,
    options: ICoreInputSchedulerProviderOptions
  ) {
    this.alreadyRegistered = false;
    // Save the constructor parameters to local class variables
    this.logger = logger;
    this.options = options;
    this.scheduler = new TaskScheduler({
      logger,
      schedulerConfig,
      scheduledFn: this.schedulerHandler.bind(this),
    });
  }

  /**
   * registerHandler
   * This is called by the rules engine when it starts. This function starts the task scheduler
   *
   * Do this by...
   * 1. Set the rules engine apply function for use later
   * 2. If we are not already setup then start the scheduler
   *
   * @param applyInputCb - a handler that will be called when there is input. It should be passed input and context.
   * @returns Promise<void>
   **/
  async registerInput(
    applyInputCb: (input: any, context: any) => Promise<any>
  ) {
    this.logger?.debug(`CoreInputScheduler.registerHandler: Start`);

    // 1. Set the rules engine apply function for use later
    this.applyInputCb = applyInputCb;

    if (!this.alreadyRegistered) {
      // 2. If we are not already setup then start the scheduler
      this.scheduler.start();

      this.alreadyRegistered = true;
    }
    this.logger?.debug(`CoreInputScheduler.registerHandler: End`);
  }

  /**
   * schedulerHandler
   * Handle the scheduler interval
   *
   * does this by
   * 1. Build input facts
   * 2. Optionaly call inputContextCallback if it is defined to build a context
   * 3. Pass input facts and context to the rules engine
   */
  async schedulerHandler(task: Task) {
    this.logger?.debug(`CoreInputScheduler.schedulerHandler: Start`);
    try {
      //  1. Build input facts
      let input: ICoreSchedulerInput = {
        name: task.name,
        intervalText: task.taskConfig.intervalText || undefined,
        intervalCron: task.taskConfig.intervalCron || undefined,
        input: task.input,
        queue: {
          waiting: task.promiseQueue.size,
          pending: task.promiseQueue.pending,
        },
      };

      // And an object for our context
      let context: any = {};

      // 2. Optionaly call inputContextCallback if it is defined to build a context
      if (this.options.inputContextCallback) {
        context = _.merge(context, this.options.inputContextCallback(input));
      }

      // 3. Pass input facts and context to the rules engine
      await this.applyInputCb({ scheduledTask: input }, context);
    } catch (ex) {
      this.logger?.error('ERROR: CoreInputScheduler.schedulerHandler', ex);
    }
    this.logger?.debug(`CoreInputScheduler.schedulerHandler: End`);
  }

  async unregisterInput() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.scheduler.stop();
        this.alreadyRegistered = false;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
