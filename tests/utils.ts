import _ from 'lodash';
import log4js from 'log4js';
import { stubInterface } from 'ts-sinon';
//@ts-ignore
//import * as Engine from 'rules-js';
//import { ImportMock } from 'ts-mock-imports';
import {
  IInputProvider,
  IOutputProvider,
  //IRuleCorpusRuleGroup,
  //IRuleClosure,
} from '../src';

export default class Utils {
  static corpus = [
    {
      name: 'Clear All inventory Items',
      rules: [
        {
          when: [
            { closure: 'isMatch', 'event.type': 'test' },
            { closure: 'inventoryExist', item: 'testitem' },
          ],
          then: [
            {
              closure: 'extendFacts',
              'result.clearInventory': true,
              'inventory.items': [],
            },
          ],
        },
      ],
    },
  ];

  static closures = [
    {
      name: 'inventoryExist',
      handler(facts: any, context: any) {
        return facts.inventory.item.includes(context.parameters.item);
      },
      options: { required: ['item'] },
    },
    {
      name: 'isMatch',
      handler(facts: any, context: any) {
        let ret = true;
        for (let field of Object.keys(context.parameters)) {
          ret = _.get(facts, field) === context.parameters[field];
          if (!ret) break;
        }
        return ret;
      },
    },
    {
      name: 'extendFacts',
      handler(facts: any, context: any) {
        for (let field of Object.keys(context.parameters)) {
          _.set(facts, field, context.parameters[field]);
        }
        return facts;
      },
    },
  ];

  static generateRulesHarvesterConfig({
    corpus = this.corpus,
    closures = this.closures,
    extraConfig = {},
  }: any) {
    let rulesInputStub = stubInterface<IInputProvider>();
    let rulesOutputStub = stubInterface<IOutputProvider>();

    let logger = log4js.getLogger();
    logger = log4js.getLogger('synchronous');
    logger.level = 'info';

    let config = Object.assign(
      {},
      {
        providers: {
          inputs: [rulesInputStub],
          outputs: [rulesOutputStub],
          corpus,
          closures,
          logger,
        },
      },
      extraConfig
    );
    return {
      logger,
      rulesInputStub,
      rulesOutputStub,
      config,
    };
  }
}
