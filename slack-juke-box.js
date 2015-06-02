Songs = new Mongo.Collection("songs")

if (Meteor.isClient) {
  // This code only runs on the client

  var yt = new YTPlayer("player", {videoId: 'zE7PKRjrid4'} )

  // Tracker.autorun(function () {
  //   var yt_id =  'HMUDVMiITOU' // the video id for a youtube video
  //   if (yt.ready()) yt.player.loadVideoById(yt_id);
  // });

  Tracker.autorun(function (song) {
    console.log(song);
    var yt_id = 'EUF-yFIQd_0' // the video id for a youtube video
    if (yt.ready()) {
      function play() {
        yt.player.loadVideoById(yt_id);
        yt.player.addEventListener('onStateChange', function (e) {
          if (e.data === YT.PlayerState.ENDED) {
            var SongDoc = Songs.find({}, {limit:1}).fetch();
            yt_id = SongDoc[0].songId;
            play();
            Meteor.call("deleteSong", SongDoc[0]._id)
            console.log(SongDoc[0]);
          }
        });
      }
      play();
    }
  });

  Template.body.helpers({
    songs: function () {
      return Songs.find({});
    }
  });

  Template.song.events({
    "click .delete": function () {
      Meteor.call("deleteSong", this._id)
    }
  })
}

Meteor.methods({
  deleteSong: function (song_Id) {
    Songs.remove(song_Id);
  }
})

if (Meteor.isServer) {
  Meteor.methods({
    checkSlack: function () {
      this.unblock();
      return Meteor.http.call("GET", "https://slack.com/api/groups.history?token=xoxp-3171645816-3866436144-5155539063-59168a&channel=G03PTETT3&count=1");
    },
    getTitle: function (id) {
      this.unblock();
      return Meteor.http.call("GET", "https://www.googleapis.com/youtube/v3/videos?id="+ id +"&key=AIzaSyCUrPqWh5FkrcJeGfTNeubsnd6AXgAYA7k&part=snippet")
    }
  });
  Meteor.startup(function () {
    Meteor.setInterval( function () {
      Meteor.call("checkSlack", function(err, res) {
        // console.log(res.data.messages[0].text); 
        link = res.data.messages[0].text;
        link = link.split(" ");
        if (link[0] == "music") {
          var newSongId = link[1].match( /v=(.*)$/g )[0];
          newSongId = newSongId.slice(2, -1);
          var songExist = Songs.findOne({songId: newSongId});

          if (songExist){
            // console.log("song already in queue")
          } else {
            Meteor.call("getTitle", newSongId, function(err, res) {
              console.log(res.data.items[0].snippet.title);
              var newTitle = res.data.items[0].snippet.title;
              console.log(newSongId);
              Songs.update(
                { songId: newSongId },
                { $set: { title: newTitle, createdAt: new Date()}},
                { upsert: true }
              );
            })
          }
        }
      });
    }, 1000 );
  });
}