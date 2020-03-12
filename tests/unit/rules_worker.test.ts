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
    await rulesInputStub.registerInput.lastCall.args[0]({
      event: {
        type: 'test',
      },
    });

    // This is to give the input handler time to run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet,
      'Correct result in output'
    ).to.equal(true);
  });
});
