const React = require('react');

const Rule = require('./rule.jsx');

class RuleList extends React.Component {
  constructor(props) {
    super(props);

    this.handleRuleDestroy = (rule) => {
      this.props.onRuleDestroy(rule);
    };

    this.handleRuleUpdate = (rule) => {
      this.props.onRuleUpdate(rule);
    };
  }

  render() {
    const ruleNodes = this.props.data.map((rule, index) => {
      return (
        <Rule
          rule={rule}
          key={index}
          onRuleDestroy={this.handleRuleDestroy}
          onRuleUpdate={this.handleRuleUpdate}
        />
      );
    });
    return (
      <div className="rule-list">
        {ruleNodes}
      </div>
    );
  }
}
RuleList.propTypes = {
  data: React.PropTypes.array,
  onRuleDestroy: React.PropTypes.func.isRequired,
  onRuleUpdate: React.PropTypes.func.isRequired
};

module.exports = RuleList;
