import { expect } from 'chai';
import _ from 'lodash';
import 'mocha';
import Utils from '../utils';
import RulesHarvester from '../../src';

describe('Rules Harvester', () => {
  // Just make sure it initializes
  it('Constructor: Initializes', () => {
    expect(new RulesHarvester(Utils.generateRulesHarvesterConfig({}).config)).to
      .not.be.undefined;
  });

  it('Rules where added', () => {
    const ruleCorpuses = [
      {
        name: 'Set something',
        rules: [
          {
            when: [{ closure: 'isMatch', 'message.topic': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet': true }],
          },
        ],
      },
    ];
    let { config } = Utils.generateRulesHarvesterConfig({ ruleCorpuses });
    let rulesHarvester = new RulesHarvester(config);
    expect(
      rulesHarvester.ruleGroups.length,
      'ruleGroups should have some rules pushed into it'
    ).to.equal(1);
  });

  it('input provider setup', () => {
    let {
      rulesInputStub,
      //rulesOutputStub,
      config,
    } = Utils.generateRulesHarvesterConfig({});
    let rulesHarvester = new RulesHarvester(config);
    expect(
      rulesInputStub.registerInput.called,
      'registerInput was called but should not have been'
    ).to.be.false;
    rulesHarvester.start();
    expect(
      rulesInputStub.registerInput.called,
      'registerInput was not called but should have been'
    ).to.be.true;
    //rulesInputStub.constructor().registerInput(input => console.log(input));
    expect(rulesInputStub).to.not.be.undefined;
  });

  it('Output handler called', async () => {
    const corpus = [
      {
        name: 'Set something',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet': true }],
          },
        ],
      },
      {
        name: 'Set something2',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet2': true }],
          },
        ],
      },
    ];
    let {
      config,
      rulesInputStub,
      rulesOutputStub,
    } = Utils.generateRulesHarvesterConfig({
      corpus,
    });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    let res = await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'test',
        },
      },
      { testContextThing: true }
    );

    // This is to give the input handler time to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet,
      'Correct result in output'
    ).to.equal(true);
  });

  it('Closure handler wrapper called', async () => {
    let closureHandlerWrapperCallcount = 0;
    const closureHandlerWrapper = async (
      facts: any,
      context: any,
      handler: (facts: any, context: any) => any | Promise<any>
    ) => {
      closureHandlerWrapperCallcount++;
      let res = await handler(facts, context);
      return res;
    };
    const corpus = [
      {
        name: 'Set something',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet2': true }],
          },
        ],
      },
    ];
    let {
      config,
      rulesInputStub,
      rulesOutputStub,
    } = Utils.generateRulesHarvesterConfig({
      corpus,
      extraConfig: {
        closureHandlerWrapper: closureHandlerWrapper,
      },
    });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0]({
      event: {
        type: 'test',
      },
    });

    // This is to give the input handler time to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet2,
      'Correct result in output'
    ).to.equal(true);

    expect(
      closureHandlerWrapperCallcount,
      'Closure handler wrapper call count was wrong'
    ).to.equal(2);
  });

  it('Closure runtime context set', async () => {
    let closureHandlerWrapperCallcount = 0;
    let contextValueSet = false;
    let runTimeContext = { runTimeContextValue: 'SomRuntimeValue' };
    const closureHandlerWrapper = async (
      facts: any,
      context: any,
      handler: (facts: any, context: any) => any | Promise<any>
    ) => {
      closureHandlerWrapperCallcount++;
      expect(
        context.runTimeContextValue,
        'Runtime context was not properly set'
      ).to.equal(runTimeContext.runTimeContextValue);
      let res = await handler(facts, context);
      return res;
    };
    const corpus = [
      {
        name: 'Set something',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet': true }],
          },
        ],
      },
      {
        name: 'Set something2',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet2': true }],
          },
          {
            when: [{ closure: 'isMatch', 'event.type': 'test2' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet3': true }],
          },
        ],
      },
    ];
    let {
      config,
      rulesInputStub,
      rulesOutputStub,
    } = Utils.generateRulesHarvesterConfig({
      corpus,
      extraConfig: {
        closureHandlerWrapper: closureHandlerWrapper,
      },
    });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'test',
        },
      },
      runTimeContext
    );

    // This is to give the input handler time to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet2,
      'Correct result in output'
    ).to.equal(true);

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet3,
      'Condition returned true when it should have been false'
    ).to.not.equal(true);

    expect(
      closureHandlerWrapperCallcount,
      'Closure handler wrapper call count was wrong'
    ).to.equal(5);
  });
});
