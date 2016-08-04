const React = require('react');
const classNames = require('classnames');

const helpers = require('../javascripts/helpers');

const RuleForm = require('./rule_form.jsx');

const automaticEvents = {
  ignitionOn: 'Ignition on',
  ignitionOff: 'Ignition off'
};

class Rule extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.showRuleEdit = () => {
      this.setState({editing: true});
      this.render();
    };

    this.hideRuleEdit = () => {
      this.setState({editing: false});
      this.render();
    };

    this.destroy = () => {
      if (confirm('Are you sure you want to delete this rule?')) {
        this.props.onRuleDestroy(this.props.rule);
      }
    };

    this.handleRuleCancel = () => {
      this.resetRule();
      this.hideRuleEdit();
    };

    this.handleRuleUpdate = (rule) => {
      rule._id = this.props.rule._id;
      this.props.onRuleUpdate(rule);
      this.hideRuleEdit();
    };

    this.handleRuleStatusChange = () =>{
      this.props.rule.enabled = this.refs.enabled.checked;
      this.handleRuleUpdate(this.props.rule);
    };
  }

  getTimes() {
    const rule = this.props.rule;
    if (rule.allDay !== true) {
      return (
        <span>between <mark>{rule.startTime}</mark> and <mark>{rule.endTime}</mark></span>
      );
    }

    return (
      <mark>anytime</mark>
    );
  }

  getTimeFilter() {
    const daysArray = [];
    let times = this.getTimes();
    let days;
    const rule = this.props.rule;
    if (rule.daySunday === true) {
      daysArray.push('Sun');
    }
    if (rule.dayMonday === true) {
      daysArray.push('Mon');
    }
    if (rule.dayTuesday === true) {
      daysArray.push('Tue');
    }
    if (rule.dayWednesday === true) {
      daysArray.push('Wed');
    }
    if (rule.dayThursday === true) {
      daysArray.push('Thu');
    }
    if (rule.dayFriday === true) {
      daysArray.push('Fri');
    }
    if (rule.daySaturday === true) {
      daysArray.push('Sat');
    }

    if (daysArray.length === 7 && rule.allDay === true) {
      days =
        <mark>24 hours a day, 7 days a week</mark>
      ;
      // No need for times
      times = '';
    } else if (daysArray.length === 7) {
      days =
        <mark>every day</mark>
      ;
    } else if (daysArray.length > 1) {
      const last = daysArray.pop();

      days =
        <mark>{daysArray.join(', ')} and {last}</mark>
      ;
    } else if (daysArray.length === 1) {
      days =
        <mark>{daysArray[0]}</mark>
      ;
    } else {
      days =
        <mark>never</mark>
      ;
    }

    return (
      <span>
        {days} {times}
      </span>
    );
  }

  getLocation() {
    const rule = this.props.rule;
    if (rule.anywhere === true) {
      return (
        <mark>anywhere</mark>
      );
    }

    return (
      <span>near <mark>{helpers.formatAddress(this.props.rule.address)}</mark></span>
    );
  }

  getPhone() {
    const rule = this.props.rule;
    if (!rule.phone) {
      return <span />;
    }

    return (
      <span>&nbsp;texts <mark>+{rule.countryCode} {rule.phone}</mark></span>
    );
  }

  render() {
    let content;
    if (this.state.editing) {
      content =
        <RuleForm
          onRuleSubmit={this.handleRuleUpdate}
          onRuleCancel={this.handleRuleCancel}
          rule={this.props.rule}
          ref="ruleForm"
        />
      ;
    } else {
      const rule = this.props.rule;

      content = (
        <div>
          <div className="rule-controls">
            <a className="btn-edit glyphicon glyphicon-pencil" onClick={this.showRuleEdit}></a>
            <a className="btn-delete glyphicon glyphicon-trash" onClick={this.destroy}></a>
          </div>
          <div  className={classNames({
            disabled: rule.enabled === false,
            'rule-summary': true
          })}>
            <div className="rule-status">
              <label className="switch-light switch-candy" onClick={this.handleRuleStatusChange}>
                <input type="checkbox" ref="enabled" title="Enabled" defaultChecked={rule.enabled} key={rule._id} />
                <span>
                  <span>Off</span>
                  <span>On</span>
                  <a></a>
                </span>
              </label>
            </div>
            <h3 className="title">
              {rule.title}
            </h3>
            <div className="rule-summary-row">
              <mark>{automaticEvents[rule.automaticEvent]}</mark> {this.getLocation()} {this.getPhone()}
            </div>
            <div className="rule-summary-row">
              Applies {this.getTimeFilter()}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rule">
        {content}
      </div>
    );
  }

  resetRule() {
    // TODO: reset the rule
  }
}
Rule.propTypes = {
  rule: React.PropTypes.object,
  onRuleDestroy: React.PropTypes.func.isRequired,
  onRuleUpdate: React.PropTypes.func.isRequired
};

module.exports = Rule;
