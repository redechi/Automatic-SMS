const React = require('react');
const ReactDOM = require('react-dom');
const $ = require('jquery');
window.jQuery = $;

require('bootstrap-sass');

// Only allow one popover at a time, close popovers when a user clicks off
$('body').on('click', (e) => {
  $('[data-toggle="popover"]').siblings('.popover').each(() => {
    const $popover = $(this).siblings('[data-toggle="popover"]');

    // Don't close popover if clicking on itself
    if ($popover.has(e.target).length !== 0 || $('.popover').has(e.target).length !== 0) {
      return;
    }

    $popover.popover('hide');
  });
});

class Menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      first_name: 'User'
    };
  }

  componentDidMount() {
    this.loadUserFromServer();

    // Enable popovers
    $('.user-menu')
      .popover('destroy')
      .popover({
        html: true,
        content: () => { return $('.user-menu .popover-template').html(); },
        placement: 'bottom',
        viewport: '.wrapper'
      });

    $('.top-menu').on('click', '#disconnect', () => {
      return confirm('Are you sure you want to disconnect your account? This will delete all existing rules.');
    });
  }

  render() {
    return (
      <div className="user-menu" data-toggle="popover">
        <span className="user-name">{this.state.first_name}</span>
        <i className="fa fa-angle-down fa-lg"></i>

        <div className="popover-template">
          <ul>
            <li>
              <a href="https://dashboard.automatic.com">Go to your Dashboard</a>
            </li>
            <li>
              <a href="/logout/">Log out</a>
            </li>
          </ul>
          <ul className="border-top">
            <li>
              <a id="disconnect" href="/disconnect/"><i className="times">&times;</i>Disconnect</a>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  loadUserFromServer() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      success: (data) => {
        if (!data || data.error || !data.first_name) {
          data = {first_name: 'User'};
        }
        this.setState(data);
      },
      error: (xhr, status, err) => {
        console.error(this.props.url, status, err.toString());
      }
    });
  }
}

Menu.propTypes = {
  url: React.PropTypes.string
};

ReactDOM.render(
  <Menu url="/api/user/" />,
  document.getElementById('top-menu')
);
