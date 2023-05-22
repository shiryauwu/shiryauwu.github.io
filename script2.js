/*ymaps.ready(init)


function init() {
    let map = new ymaps.Map('map', {
        center: [55.82639251104599, 49.148980333393254],
        zoom: 15
    });
    map.controls.remove('searchControl');
    map.controls.remove('fullscreenControl');
    map.controls.remove('searchControl');
    map.behaviors.disable(['scrollZoom']);

    let placemark = new ymaps.Placemark([55.82639251104599, 49.148980333393254], {
        balloonContentHeader: 'Трейд-Модус',
        balloonContentBody: 'Тц Савиново, 3 этаж',
        balloonContentFooter: 'Ямашева 93'
    }, {
        iconLayout: 'default#image',
        iconImageHref: 'images/map.png',
        iconImageSize: [50, 50],
        iconImageOffset: [0, -20]

    });

    map.geoObjects.add(placemark);
}
*/

$(document).ready(function () {
    let header = $('.header')
    let headerHeight = header.height();
    ; $(window).scroll(function () {
        const scrolled = $(this).scrollTop();
        if (scrolled > 1) {
            $('body').addClass('sticky');
            $('.header__logo').css('display', 'block');
            $('.header__logo').css('transition', '0,7s', 'ease');



        } else if (scrolled < 1) {
            $('body').removeClass('sticky');
            $('.header__logo').css('display', 'none');
            $('.header__logo').css('transition', '0,7s', 'ease');

        }
    });
    $('a[href^="#"]').bind("click", function (e) {
        var anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $(anchor.attr('href')).offset().top - 110
        }, {
            duration: 700,
            easing: 'swing'
        }, 1000);


        e.preventDefault();
    });
    const media = window.matchMedia(' all and (max-width: 500px)')
    if (media.matches) {
        $('.header__inner').toggleClass('header__burger');
    }
});
