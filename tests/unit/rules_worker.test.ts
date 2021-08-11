import { expect } from 'chai';
import _ from 'lodash';
import 'mocha';
import Utils from '../utils';
import RulesHarvester, { closureGenerator } from '../../src';

describe('Rules Harvester', () => {
  // Just make sure it initializes
  it('Constructor: Initializes', () => {
    expect(new RulesHarvester(Utils.generateRulesHarvesterConfig({}).config)).to
      .not.be.undefined;
  });

  it('Rules were added', () => {
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
    rulesHarvester.setup(); // This needs run after constructure
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
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
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
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
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
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
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

  it('applyRule ruleGroupOverrides works', async () => {
    let runTimeContext = { runTimeContextValue: 'SomRuntimeValue' };
    const corpus = [
      {
        name: 'SetSomething1Group',
        rules: [
          {
            when: [{ closure: 'isMatch', 'event.type': 'test' }],
            then: [{ closure: 'extendFacts', 'result.somethingSet': true }],
          },
        ],
      },
      {
        name: 'SetSomething2Group',
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
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        extraConfig: {},
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
      runTimeContext,
      ['SetSomething2Group']
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    // Should not call this for the specified ruleGroupOverrides
    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet,
      'Value was set but should not have been given the ruleGroupOverrides that was set'
    ).to.not.equal(true);

    // Should call this for the specified ruleGroupOverrides
    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet2,
      'Correct result in output'
    ).to.equal(true);

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result.somethingSet3,
      'Condition returned true when it should have been false'
    ).to.not.equal(true);
  });

  it('applyRule hat (^) parameter set passed parameter from facts path', async () => {
    let runTimeContext = { runTimeContextValue: 'SomRuntimeValue' };
    const corpus = [
      {
        name: 'TestHatPathsGroup',
        rules: [
          {
            when: ['always'],
            then: [
              { closure: 'extendFacts', '^result.eventType': 'event.type' },
            ],
          },
        ],
      },
    ];
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        closures: [
          ...Utils.closures,
          {
            name: 'always',
            handler(_facts: any, _context: any) {
              return true;
            },
          },
        ],
        extraConfig: {},
      });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'goldrush',
        },
      },
      runTimeContext
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    // Should not call this for the specified ruleGroupOverrides
    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result?.eventType,
      'Hat parmameter does not appear to have correctly been parsed'
    ).to.equal('goldrush');
  });

  it('applyRule hat (^) Deep derefernces', async () => {
    let runTimeContext = { runTimeContextValue: 'SomRuntimeValue' };
    const corpus = [
      {
        name: 'TestHatPathsGroup',
        rules: [
          { closure: 'extendFacts', '^result.single': 'event.single' },
          {
            closure: 'extendFacts',
            '^result.array': ['nonderefval', '^event.array'],
          },
          {
            closure: 'extendFacts',
            '^result.object': {
              '^objectKey': 'event.object',
              nonderefkey: 'nonderefval',
            },
          },
          {
            closure: 'extendFacts',
            '^result.arrayobject': [
              'nonderefval',
              {
                '^arrayobjectKey': 'event.arrayobject',
                nonderefkey: 'nonderefval',
              },
            ],
          },
          {
            closure: 'extendFacts',
            '^result.objectarray': {
              '^objectarrayKey': [
                'nonderefval',
                {
                  '^objectarrayKey': 'event.objectarray',
                  nonderefkey: 'nonderefval',
                },
              ],
              nonderefkey: 'nonderefval',
            },
          },
        ],
      },
    ];
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        closures: [...Utils.closures],
        extraConfig: {},
      });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'goldrush',
          single: 'singleval',
          array: 'arrayval',
          object: 'objectval',
          arrayobject: { arrayobjectval: 'arrayobjectval' },
          objectarray: ['objectarrayval'],
        },
      },
      runTimeContext
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    //{ closure: 'extendFacts', '^result.single': 'event.single' },
    //{ closure: 'extendFacts', '^result.array': ['nonderefval', '^event.array'] },
    //{ closure: 'extendFacts', '^result.object': {'^objectKey': 'event.object', nonderefkey: 'nonderefval'} },
    //{ closure: 'extendFacts', '^result.arrayobject': ['nonderefval', {'^arrayobjectKey': 'event.arrayobject', nonderefkey: 'nonderefval'}] },
    //{ closure: 'extendFacts', '^result.objectarray': {'^objectarrayKey': ['nonderefval', {'^objectarrayKey': 'event.arrayobject', nonderefkey: 'nonderefval'}] }, nonderefkey: 'nonderefval'} ,

    // Should not call this for the specified ruleGroupOverrides
    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result,
      'Hat parameter does not appear to have correctly dereferenced values for the first call'
    ).to.deep.equal({
      single: 'singleval',
      array: ['nonderefval', 'arrayval'],
      object: { objectKey: 'objectval', nonderefkey: 'nonderefval' },
      arrayobject: [
        'nonderefval',
        {
          arrayobjectKey: { arrayobjectval: 'arrayobjectval' },
          nonderefkey: 'nonderefval',
        },
      ],
      objectarray: {
        objectarrayKey: [
          'nonderefval',
          { objectarrayKey: ['objectarrayval'], nonderefkey: 'nonderefval' },
        ],
        nonderefkey: 'nonderefval',
      },
    });
    //

    // Call a second time with different values to ensure parameters are not permanently modified for future calls
    let result = await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'goldrush',
          single: 'singleval',
          array: 'arrayval',
          object: 'objectval',
          arrayobject: 'arrayobjectval',
          objectarray: 'objectarrayval',
        },
      },
      runTimeContext
    );
    expect(
      rulesOutputStub.outputResult.callCount,
      'outputResult was not called on the second try'
    ).to.equal(2);

    // Should not call this for the specified ruleGroupOverrides
    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result,
      'Hat parameter does not appear to have correctly dereferenced values for the second call'
    ).to.deep.equal({
      single: 'singleval',
      array: ['nonderefval', 'arrayval'],
      object: { objectKey: 'objectval', nonderefkey: 'nonderefval' },
      arrayobject: [
        'nonderefval',
        { arrayobjectKey: 'arrayobjectval', nonderefkey: 'nonderefval' },
      ],
      objectarray: {
        objectarrayKey: [
          'nonderefval',
          { objectarrayKey: 'objectarrayval', nonderefkey: 'nonderefval' },
        ],
        nonderefkey: 'nonderefval',
      },
    });
  });

  it('applyRule hat (^) Missing dereference', async () => {
    let runTimeContext = { runTimeContextValue: 'SomRuntimeValue' };
    const corpus = [
      {
        name: 'TestHatPathsGroup',
        rules: [
          {
            closure: 'extendFacts',
            '^result.missing': 'event.missing',
            '^result.test': 'event.single',
          },
        ],
      },
    ];
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        closures: [...Utils.closures],
        extraConfig: {},
      });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      {
        event: {
          type: 'goldrush',
          single: 'singleval',
        },
      },
      runTimeContext
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts.result,
      'No '
    ).to.deep.equal({
      missing: undefined,
      test: 'singleval',
    });
  });

  it('Functional closureParameters work correctly', async () => {
    let runTimeContext = {
      runTimeContextValue: 'Functional closureParameters work correctly',
    };
    const corpus = [
      {
        name: 'TestHatPathsGroup',
        rules: [
          {
            closure: 'callClosureParmeter',
            closureParam: 'testClosureParmeter',
          },
        ],
      },
    ];
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        closures: [
          ...Utils.closures,
          {
            name: 'callClosureParmeter',
            async handler(facts: any, context: any) {
              facts.closureParamReturn =
                await context.parameters.closureParam.process(facts, context);
              return facts;
            },
            options: {
              requred: ['closureParam'],
              closureParameters: ['closureParam'],
            },
          },
          {
            name: 'testClosureParmeter',
            handler(_facts: any, _context: any) {
              return 123;
            },
          },
          {
            name: 'never',
            handler(_facts: any, _context: any) {
              return false;
            },
            options: {},
          },
          {
            name: 'always',
            handler(_facts: any, _context: any) {
              return true;
            },
          },
        ],
        extraConfig: {},
      });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      { test: 1 },
      runTimeContext
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts,
      'No '
    ).to.deep.equal({
      test: 1,
      closureParamReturn: 123,
    });
  });

  it('JSON closureParameters work correctly', async () => {
    let runTimeContext = {
      runTimeContextValue: 'JSON closureParameters work correctly',
    };
    const corpus = [
      {
        name: 'TestHatPathsGroup',
        rules: [
          {
            closure: 'callClosureParmeter',
            closureParam: 'testClosureParmeterWrapper',
          },
        ],
      },
    ];
    let { config, rulesInputStub, rulesOutputStub } =
      Utils.generateRulesHarvesterConfig({
        corpus,
        closures: [
          ...Utils.closures,
          {
            name: 'never',
            handler(_facts: any, _context: any) {
              return false;
            },
            options: {},
          },
          {
            name: 'always',
            handler(_facts: any, _context: any) {
              return true;
            },
          },
          {
            name: 'callClosureParmeter',
            async handler(facts: any, context: any) {
              facts.closureParamReturn =
                await context.parameters.closureParam.process(facts, context);
              return facts;
            },
            options: {
              requred: ['closureParam'],
              closureParameters: ['closureParam'],
            },
          },
          {
            name: 'testClosureParmeter',
            handler(_facts: any, _context: any) {
              return 321;
            },
          },
          {
            name: 'testClosureParmeterWrapper',
            rules: [{ closure: 'testClosureParmeter' }], // We know this returns false for us
          },
        ],
        extraConfig: {},
      });
    // Construct
    let rulesHarvester = new RulesHarvester(config);

    // Start - This registers the callback handler
    rulesHarvester.start();

    // Call the applyRule callback registered by the rules harvester that will end up applying rules
    await rulesInputStub.registerInput.lastCall.args[0](
      { },
      runTimeContext
    );

    expect(rulesOutputStub.outputResult.called, 'outputResult was not called')
      .to.be.true;

    expect(
      rulesOutputStub.outputResult.lastCall.args[0].facts,
      'No '
    ).to.deep.equal({
      closureParamReturn: 321,
    });
  });
});
