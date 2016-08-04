const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('underscore');
const $ = require('jquery');
const jstz = require('jstimezonedetect');

const RuleList = require('./rule_list.jsx');
const RuleForm = require('./rule_form.jsx');

class Rules extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };

    this.handleRuleSubmit = (rule) => {
      rule.timezone = this.getTimezone();

      $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'POST',
        data: rule,
        success: (data) => {
          const rules = this.state.data;
          rules.push(data);

          this.setState({data: rules});
        },
        error: (xhr, status, err) => {
          console.error(this.props.url, status, err.toString());
        }
      });
      this.hideRuleForm();
    };

    this.handleRuleUpdate = (rule) => {
      rule.timezone = this.getTimezone();

      // Update rule optimistically
      const rules = this.state.data;

      rules.forEach((r, idx) => {
        if (r._id === rule._id) {
          rules[idx] = rule;
        }
      });

      this.setState({data: rules}, () => {
        $.ajax({
          url: this.props.url,
          dataType: 'json',
          type: 'PUT',
          data: rule,
          error: (xhr, status, err) => {
            console.error(this.props.url, status, err.toString());
          }
        });
      });
    };

    this.handleRuleDestroy = (rule) => {
      // Delete rule optimistically
      const rules = this.state.data;
      this.setState({
        data: _.reject(rules, (r) => { return r._id === rule._id;})
      });

      $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'DELETE',
        data: {_id: rule._id},
        error: (xhr, status, err) => {
          console.error(this.props.url, status, err.toString());
        }
      });
    };

    this.handleRuleCancel = () => {
      this.hideRuleForm();
    };

    this.showRuleForm = () => {
      this.setState({showRuleForm: true});
    };

    this.hideRuleForm = () => {
      this.setState({showRuleForm: false});
    };
  }

  componentDidMount() {
    this.loadRulesFromServer();
    this.loadCountsFromServer();
  }

  getTimezone() {
    const timezone = jstz.determine();
    return timezone.name();
  }

  render() {
    if (this.state.error) {
      return (
        <div className="alert alert-danger">{errors[this.state.error] || this.state.error}</div>
      );
    }

    let ruleForm;

    if (this.state.showRuleForm) {
      ruleForm =
          <div className="createRule">
            <h2>Create a new Rule</h2>
            <RuleForm
              onRuleSubmit={this.handleRuleSubmit}
              onRuleCancel={this.handleRuleCancel}
            />
          </div>
        ;
    } else {
      ruleForm =
        <a
          className="btn btn-blue btn-lg btn-create"
          onClick={this.showRuleForm}
        ><i className="glyphicon glyphicon-plus"></i> Create a New Rule</a>
      ;
    }

    return (
      <div>
        <div className="count">Messages sent this month: {this.state.count} of {smsMonthlyLimit}</div>
        <div className="rule-box">
          <RuleList data={this.state.data} onRuleDestroy={this.handleRuleDestroy} onRuleUpdate={this.handleRuleUpdate} />
          {ruleForm}
        </div>
      </div>
    );
  }

  loadRulesFromServer() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      success: (data) => {
        this.setState({data: data});
      },
      error: (xhr, status, err) => {
        console.error(this.props.url, status, err.toString());
      }
    });
  }

  loadCountsFromServer() {
    $.ajax({
      url: this.props.countURL,
      dataType: 'json',
      success: (data) => {
        this.setState({count: data.count || 0});
      },
      error: (xhr, status, err) => {
        console.error(this.props.countURL, status, err.toString());
      }
    });
  }
}
Rules.propTypes = {
  url: React.PropTypes.string.isRequired,
  countURL: React.PropTypes.string.isRequired
};

ReactDOM.render(
  <Rules url="/api/rules/" countURL="/api/counts" />,
  document.getElementById('content')
);
